import 'server-only';
import fs from 'fs';
import path from 'path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import { supabase } from './supabaseClient';

const authFile = () => path.join(process.env.PROPOSAL_DATA_DIR || path.join(process.cwd(), 'data'), 'auth_store.json');
function localStore() {
  try { return JSON.parse(fs.readFileSync(authFile(), 'utf8')); }
  catch { return { adminPassword: '', departmentPasswords: {} }; }
}
export function hashPassword(value: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(value, salt, 32).toString('hex')}`;
}
export function matchesPassword(input: unknown, stored: unknown): boolean {
  if (typeof input !== 'string' || !input || input.length > 256 || typeof stored !== 'string' || !stored) return false;
  if (stored.startsWith('scrypt$')) {
    const [, salt, digest] = stored.split('$');
    if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{64}$/.test(digest || '')) return false;
    return timingSafeEqual(scryptSync(input, salt, 32), Buffer.from(digest, 'hex'));
  }
  // Preserve existing issued passwords; subsequent saves store hashes only.
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(stored).digest();
  return timingSafeEqual(a, b);
}
function adminCredential(): string {
  return process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV !== 'production' ? localStore().adminPassword || '' : '');
}
export function verifyAdminPassword(input: string): boolean { return matchesPassword(input, adminCredential()); }
export async function getAllDepartmentPasswordsAsync(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('organization_charts').select('description').eq('id', 'dept_passwords_store').maybeSingle();
  if (error) {
    if (process.env.NODE_ENV === 'production') throw new Error('부서 인증 저장소에 연결할 수 없습니다.');
    return localStore().departmentPasswords || {};
  }
  if (data?.description) {
    const parsed = JSON.parse(data.description);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('부서 인증 정보 형식 오류');
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string')) as Record<string, string>;
  }
  return process.env.NODE_ENV === 'production' ? {} : localStore().departmentPasswords || {};
}
export async function getDepartmentAuthStatus(dept: string) {
  const passwords = await getAllDepartmentPasswordsAsync();
  return { hasPassword: Boolean(passwords[dept]) };
}
export async function verifyDepartmentPassword(dept: string, input: string) {
  return matchesPassword(input, (await getAllDepartmentPasswordsAsync())[dept]);
}
export async function credentialVersion(role: 'ADMIN' | 'EVALUATOR', dept?: string): Promise<string> {
  const stored = role === 'ADMIN' ? adminCredential() : (await getAllDepartmentPasswordsAsync())[dept || ''];
  return stored ? createHash('sha256').update(stored).digest('hex') : '';
}
export async function saveAllDepartmentPasswords(changes: Record<string, string>): Promise<void> {
  const current = await getAllDepartmentPasswordsAsync();
  const patch: Record<string, string> = {};
  for (const [dept, value] of Object.entries(changes)) {
    if (typeof value !== 'string' || value.length > 256 || !dept || dept.length > 100) throw new Error('비밀번호 입력 형식 오류');
    const trimmed = value.trim();
    if (trimmed && trimmed.length < 4) throw new Error('비밀번호는 4자 이상이어야 합니다.');
    patch[dept] = trimmed ? hashPassword(trimmed) : '';
    if (patch[dept]) current[dept] = patch[dept]; else delete current[dept];
  }
  // Atomic merge in SQL prevents concurrent changes to other departments being lost.
  const { error } = await supabase.rpc('set_department_passwords', { changes: patch });
  if (error) throw new Error('비밀번호 저장에 실패했습니다. 보안 SQL 적용 여부를 확인해주세요.');
}
export async function setupDepartmentPassword(dept: string, password: string) {
  await saveAllDepartmentPasswords({ [dept]: password });
}
