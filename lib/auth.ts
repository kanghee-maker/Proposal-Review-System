import fs from 'fs';
import path from 'path';
import { timingSafeEqual } from 'node:crypto';
import { supabase } from './supabaseClient';

const DATA_DIR = path.join(process.cwd(), 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth_store.json');
const DEFAULT_ADMIN_PASSWORD = '0423';

interface AuthStore {
  adminPassword: string;
  departmentPasswords: Record<string, string>; // deptName -> password
}

function getAuthStore(): AuthStore {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(AUTH_FILE)) {
      const initial: AuthStore = {
        adminPassword: DEFAULT_ADMIN_PASSWORD,
        departmentPasswords: {}
      };
      fs.writeFileSync(AUTH_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const content = fs.readFileSync(AUTH_FILE, 'utf8');
    const parsed = JSON.parse(content);
    return {
      adminPassword: typeof parsed.adminPassword === 'string' && parsed.adminPassword ? parsed.adminPassword : DEFAULT_ADMIN_PASSWORD,
      departmentPasswords: parsed.departmentPasswords || {}
    };
  } catch (err) {
    return { adminPassword: DEFAULT_ADMIN_PASSWORD, departmentPasswords: {} };
  }
}

function saveAuthStore(store: AuthStore) {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save auth store:', err);
  }
}

// 1. 관리자 비밀번호
export function verifyAdminPassword(input: unknown): boolean {
  return matchesPassword(input, getAuthStore().adminPassword);
}

export function verifyStatsPassword(input: unknown): boolean {
  const adminPassword = getAuthStore().adminPassword;
  if (!/^\d+$/.test(adminPassword)) return false;
  const statsPassword = adminPassword.replace(/\d/g, digit => String((Number(digit) + 1) % 10));
  return matchesPassword(input, statsPassword);
}

function matchesPassword(input: unknown, password: string): boolean {
  if (typeof input !== 'string' || input.length !== password.length) return false;
  const candidate = Buffer.from(input);
  const expected = Buffer.from(password);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// 2. 부서 비밀번호
export async function getDepartmentAuthStatus(deptName: string): Promise<{ hasPassword: boolean }> {
  // 1. Supabase DB 조회
  try {
    const { data, error } = await supabase
      .from('organization_charts')
      .select('description')
      .eq('id', 'dept_passwords_store')
      .single();

    if (!error && data?.description) {
      const dbPasswords = JSON.parse(data.description);
      if (dbPasswords && Boolean(dbPasswords[deptName])) {
        return { hasPassword: true };
      }
    }
  } catch (err) {}

  // 2. Local fallback 확인
  const store = getAuthStore();
  if (store.departmentPasswords && Boolean(store.departmentPasswords[deptName])) {
    return { hasPassword: true };
  }

  // 3. Supabase departments 확인 (컬럼이 있을 경우 대비)
  try {
    const { data, error } = await supabase.from('departments').select('*').eq('department', deptName).single();
    if (!error && data && (data as any).password) {
      return { hasPassword: true };
    }
  } catch (err) {}

  return { hasPassword: false };
}

export async function verifyDepartmentPassword(deptName: string, inputPass: string): Promise<boolean> {
  // 1. Supabase DB 확인
  try {
    const { data, error } = await supabase
      .from('organization_charts')
      .select('description')
      .eq('id', 'dept_passwords_store')
      .single();

    if (!error && data?.description) {
      const dbPasswords = JSON.parse(data.description);
      if (dbPasswords && Object.prototype.hasOwnProperty.call(dbPasswords, deptName)) {
        return Boolean(dbPasswords[deptName]) && dbPasswords[deptName] === inputPass;
      }
    }
  } catch (err) {}

  // 2. Local fallback 확인
  const store = getAuthStore();
  const localPass = store.departmentPasswords[deptName];
  if (localPass) {
    return localPass === inputPass;
  }

  // 3. Supabase departments 확인
  try {
    const { data, error } = await supabase.from('departments').select('*').eq('department', deptName).single();
    if (!error && data && (data as any).password) {
      return (data as any).password === inputPass;
    }
  } catch (err) {}

  return false;
}

export async function setupDepartmentPassword(deptName: string, newPass: string): Promise<void> {
  const trimmed = (newPass || '').trim();
  await saveAllDepartmentPasswords({ [deptName]: trimmed });

  // 2. Supabase departments 테이블도 시도 (컬럼 존재 시)
  try {
    await supabase.from('departments').update({ password: trimmed } as any).eq('department', deptName);
  } catch (err) {}
}

export function getAllDepartmentPasswords(): Record<string, string> {
  const store = getAuthStore();
  return store.departmentPasswords || {};
}

export async function getAllDepartmentPasswordsAsync(): Promise<Record<string, string>> {
  let dbPasswords: Record<string, string> = {};

  // 1. Supabase DB에서 조회
  try {
    const { data, error } = await supabase
      .from('organization_charts')
      .select('description')
      .eq('id', 'dept_passwords_store')
      .single();

    if (!error && data?.description) {
      const parsed = JSON.parse(data.description);
      if (parsed && typeof parsed === 'object') {
        dbPasswords = parsed;
      }
    }
  } catch (err) {
    console.error('Supabase getAllDepartmentPasswords error:', err);
  }

  // 2. Local fallback과 병합
  const localStore = getAuthStore();
  const merged = { ...localStore.departmentPasswords, ...dbPasswords };

  // Local store도 DB 데이터로 동기화
  if (Object.keys(dbPasswords).length > 0) {
    localStore.departmentPasswords = merged;
    saveAuthStore(localStore);
  }

  return merged;
}

export async function saveAllDepartmentPasswords(map: Record<string, string>): Promise<void> {
  const store = getAuthStore();
  const table = () => supabase.from('organization_charts');
  const updates = Object.fromEntries(Object.entries(map).map(([dept, pass]) => [dept, pass.trim()]));
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await table().select('description,updated_at').eq('id', 'dept_passwords_store').maybeSingle();
    if (error) throw new Error('기존 비밀번호를 불러오지 못했습니다.');
    const passwords = { ...store.departmentPasswords, ...(data?.description ? JSON.parse(data.description) : {}), ...updates };
    const record = {
      id: 'dept_passwords_store',
      name: 'department_passwords',
      version: '2026-v1.0',
      description: JSON.stringify(passwords),
      updated_at: new Date(Math.max(Date.now(), (Date.parse(data?.updated_at || '') || 0) + 1)).toISOString()
    };
    const result = data
      ? await (data.updated_at
        ? table().update(record).eq('id', record.id).eq('updated_at', data.updated_at)
        : table().update(record).eq('id', record.id).is('updated_at', null)).select('id')
      : await table().insert(record).select('id');
    if (result.error?.code === '23505') continue;
    if (result.error) throw new Error('비밀번호를 저장하지 못했습니다.');
    if (result.data?.length) {
      saveAuthStore({ ...store, departmentPasswords: passwords });
      return;
    }
  }
  throw new Error('다른 변경이 먼저 저장되었습니다. 새로고침하고 다시 시도해 주세요.');
}

