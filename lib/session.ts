import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { credentialVersion } from './auth';

export type Principal = { role: 'ADMIN' | 'EVALUATOR'; dept?: string; exp: number; version: string };
const COOKIE = 'gcprs_session';
const TTL = 8 * 60 * 60;
function secret(): string {
  const key = process.env.AUTH_SESSION_SECRET || '';
  if (key.length < 32) throw new Error('서버 인증 환경변수가 설정되지 않았습니다.');
  return key;
}
export function configurationReady(): boolean {
  return (process.env.AUTH_SESSION_SECRET || '').length >= 32 &&
    (process.env.NODE_ENV !== 'production' || Boolean(
      (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD) &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) &&
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    ));
}
export function signPrincipal(principal: Principal): string {
  const body = Buffer.from(JSON.stringify(principal)).toString('base64url');
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`;
}
export function verifyToken(token: string, now = Date.now()): Principal | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || token.length > 2048) return null;
    const expected = createHmac('sha256', secret()).update(parts[0]).digest();
    const actual = Buffer.from(parts[1], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const p = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!['ADMIN', 'EVALUATOR'].includes(p.role) || !Number.isFinite(p.exp) || p.exp <= now / 1000 ||
        p.exp > now / 1000 + TTL + 60 || typeof p.version !== 'string' || !p.version ||
        (p.role === 'EVALUATOR' && (typeof p.dept !== 'string' || !p.dept))) return null;
    return p;
  } catch { return null; }
}
export async function currentPrincipal(): Promise<Principal | null> {
  const p = verifyToken(cookies().get(COOKIE)?.value || '');
  if (!p) return null;
  try { return p.version === await credentialVersion(p.role, p.dept) ? p : null; }
  catch { return null; }
}
export async function loginResponse(role: Principal['role'], dept?: string) {
  const version = await credentialVersion(role, dept);
  if (!version) return NextResponse.json({ success: false, message: '인증할 수 없습니다.' }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE, signPrincipal({ role, ...(dept ? { dept } : {}), version, exp: Math.floor(Date.now() / 1000) + TTL }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: TTL
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
export function logoutResponse() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (req.headers.get('sec-fetch-site') === 'cross-site') return false;
  return !origin || origin === new URL(req.url).origin;
}
export async function authorize(req: Request, adminOnly = false) {
  if (!configurationReady()) return { principal: null, error: NextResponse.json({ success: false, error: '서버 인증 설정이 필요합니다.' }, { status: 503 }) };
  if (!['GET','HEAD'].includes(req.method) && (!sameOrigin(req) || !req.headers.get('content-type')?.startsWith('application/json'))) {
    return { principal: null, error: NextResponse.json({ success: false, error: '허용되지 않은 요청입니다.' }, { status: 403 }) };
  }
  const principal = await currentPrincipal();
  if (!principal) return { principal: null, error: NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 }) };
  if (adminOnly && principal.role !== 'ADMIN') return { principal: null, error: NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 }) };
  return { principal, error: null };
}
// Bounded per-account throttling. Use deployment WAF limits as well across instances.
const attempts = new Map<string, { count: number; until: number }>();
export function takeLoginAttempt(account: string): boolean {
  const now = Date.now();
  attempts.forEach((value, key) => { if (value.until <= now) attempts.delete(key); });
  const value = attempts.get(account);
  if (value && value.count >= 10) return false;
  if (!value && attempts.size >= 500) return false;
  attempts.set(account, { count: (value?.count || 0) + 1, until: value?.until || now + 15 * 60 * 1000 });
  return true;
}
