import fs from 'fs';
import path from 'path';
import { supabase } from './supabaseClient';

const DATA_DIR = path.join(process.cwd(), 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth_store.json');

interface AuthStore {
  adminPassword: string;
  departmentPasswords: Record<string, string>; // deptName -> password
}

function getAuthStore(): AuthStore {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(AUTH_FILE)) {
      const initial: AuthStore = {
        adminPassword: '0423',
        departmentPasswords: {}
      };
      fs.writeFileSync(AUTH_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const content = fs.readFileSync(AUTH_FILE, 'utf8');
    const parsed = JSON.parse(content);
    return {
      adminPassword: parsed.adminPassword || '0423',
      departmentPasswords: parsed.departmentPasswords || {}
    };
  } catch (err) {
    return { adminPassword: '0423', departmentPasswords: {} };
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
export function verifyAdminPassword(input: string): boolean {
  const store = getAuthStore();
  return store.adminPassword === input;
}

export function updateAdminPassword(newPass: string): void {
  const store = getAuthStore();
  store.adminPassword = newPass;
  saveAuthStore(store);
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
  if (inputPass === '0423') {
    return true;
  }

  // 1. Supabase DB 확인
  try {
    const { data, error } = await supabase
      .from('organization_charts')
      .select('description')
      .eq('id', 'dept_passwords_store')
      .single();

    if (!error && data?.description) {
      const dbPasswords = JSON.parse(data.description);
      if (dbPasswords && dbPasswords[deptName]) {
        return dbPasswords[deptName] === inputPass;
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
  const store = getAuthStore();
  if (!store.departmentPasswords) {
    store.departmentPasswords = {};
  }
  const trimmed = (newPass || '').trim();
  if (trimmed) {
    store.departmentPasswords[deptName] = trimmed;
  } else {
    delete store.departmentPasswords[deptName];
  }
  saveAuthStore(store);

  // 1. Supabase DB 영구 저장
  try {
    await supabase.from('organization_charts').upsert({
      id: 'dept_passwords_store',
      name: 'department_passwords',
      version: '2026-v1.0',
      description: JSON.stringify(store.departmentPasswords),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to sync password to Supabase:', err);
  }

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
  if (!store.departmentPasswords) {
    store.departmentPasswords = {};
  }

  // 기존 DB 데이터도 가져와서 병합
  try {
    const { data } = await supabase
      .from('organization_charts')
      .select('description')
      .eq('id', 'dept_passwords_store')
      .single();
    if (data?.description) {
      const parsed = JSON.parse(data.description);
      if (parsed && typeof parsed === 'object') {
        store.departmentPasswords = { ...parsed, ...store.departmentPasswords };
      }
    }
  } catch (e) {}

  for (const [dept, pass] of Object.entries(map)) {
    const trimmed = (pass || '').trim();
    if (trimmed) {
      store.departmentPasswords[dept] = trimmed;
    } else {
      delete store.departmentPasswords[dept];
    }
  }
  saveAuthStore(store);

  // Supabase DB 영구 저장
  try {
    const res = await supabase.from('organization_charts').upsert({
      id: 'dept_passwords_store',
      name: 'department_passwords',
      version: '2026-v1.0',
      description: JSON.stringify(store.departmentPasswords),
      updated_at: new Date().toISOString()
    });
    if (res.error) {
      console.error('Supabase saveAllDepartmentPasswords upsert error:', res.error);
    }
  } catch (err) {
    console.error('Failed to save all passwords to Supabase:', err);
  }
}

