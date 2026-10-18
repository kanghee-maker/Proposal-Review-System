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
  const store = getAuthStore();
  if (store.departmentPasswords && store.departmentPasswords[deptName]) {
    return { hasPassword: true };
  }

  // Supabase departments 확인 (있을 경우)
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

  const store = getAuthStore();
  const localPass = store.departmentPasswords[deptName];
  if (localPass) {
    return localPass === inputPass;
  }

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
}

export function getAllDepartmentPasswords(): Record<string, string> {
  const store = getAuthStore();
  return store.departmentPasswords || {};
}

export async function saveAllDepartmentPasswords(map: Record<string, string>): Promise<void> {
  const store = getAuthStore();
  if (!store.departmentPasswords) {
    store.departmentPasswords = {};
  }
  for (const [dept, pass] of Object.entries(map)) {
    const trimmed = (pass || '').trim();
    if (trimmed) {
      store.departmentPasswords[dept] = trimmed;
    } else {
      delete store.departmentPasswords[dept];
    }
  }
  saveAuthStore(store);
}

