import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type Access = { role: 'admin' } | { role: 'stats' } | { role: 'judge'; judge: string };

const COOKIE = 'gcuc_access';
const SESSION_SECONDS = 8 * 60 * 60;
declare const __GCPRS_ACCESS_SIGNING_KEY__: string;

function sign(payload: string) {
  const configuredKey = process.env.AUTH_SESSION_SECRET;
  const key = configuredKey && configuredKey.length >= 32 ? configuredKey : __GCPRS_ACCESS_SIGNING_KEY__;
  return createHmac('sha256', key).update('gcprs:access-session:v1:').update(payload).digest('base64url');
}

export function getAccess(): Access | null {
  const [payload, signature, extra] = cookies().get(COOKIE)?.value.split('.') ?? [];
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const access = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof access.expiresAt !== 'number' || access.expiresAt <= Date.now()) return null;
    if (access.role === 'admin') return { role: 'admin' };
    if (access.role === 'stats') return { role: 'stats' };
    if (access.role === 'judge' && typeof access.judge === 'string' && access.judge) {
      return { role: 'judge', judge: access.judge };
    }
    return null;
  } catch {
    return null;
  }
}

export function setAccess(response: NextResponse, access: Access) {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ ...access, expiresAt })).toString('base64url');
  response.cookies.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS
  });
  return response;
}

export function clearAccess() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(COOKIE);
  return response;
}

export function accessDenied(access: Access | null) {
  return NextResponse.json(
    { success: false, error: access ? '접근 권한이 없습니다.' : '로그인이 필요합니다.' },
    { status: access ? 403 : 401, headers: { 'Cache-Control': 'no-store' } }
  );
}
