# 부서 심사 보안 적용 안내

## 준비된 변경

- 서버에서 서명한 HttpOnly·Secure·SameSite 쿠키로 로그인 상태를 확인합니다. 브라우저의 localStorage 값만 바꿔 권한을 얻을 수 없습니다.
- 관리자 API, 관리자 화면, 평가 조회·저장, 원본 첨부파일 URL에 접근 권한 검사를 추가했습니다.
- 부서 평가자는 자신의 담당 제안과 0차 회차만 조회합니다. 평가 저장 시 담당 부서는 서버가 정하고, 마감·초안·1차 회차에는 저장할 수 없습니다.
- 부서 변경 요청은 요청 내용만 저장하며 부서 배정이나 제목을 직접 변경할 수 없습니다.
- 고정 공통 비밀번호 우회 경로를 제거했습니다. 현재 발급된 부서 비밀번호는 그대로 검증하며, 앞으로 저장하는 비밀번호는 scrypt 해시로 저장합니다. 조회 API는 기존 비밀번호를 반환하지 않습니다.
- 비밀번호 변경·발급 취소 시 해당 부서의 기존 로그인 쿠키도 무효화합니다.
- 부서 평가와 제안 상태는 DB 트랜잭션으로 함께 저장합니다. DB 실패 시 저장 성공으로 응답하지 않습니다.
- Vercel 운영 환경에서는 저장소에 포함된 JSON 파일에 쓰지 않습니다. 개발 환경의 JSON 갱신은 임시 파일을 완성한 뒤 교체하는 방식입니다.

## Vercel 적용 순서

이 변경은 별도 `codex/secure-department-review` 브랜치에 준비합니다. 운영 `main`을 바꾸기 전에 환경변수와 DB 권한을 준비해야 합니다. 환경변수가 없으면 보호된 API는 503으로 차단됩니다.

1. Supabase에서 현재 DB 백업/복구 지점을 확인합니다. 제안·평가·부서 비밀번호 데이터의 존재와 현재 건수를 확인합니다.
2. Vercel 프로젝트의 Settings → Environment Variables에서 아래 서버 전용 변수를 Production과 사용할 Preview 환경에 설정합니다. 실제 값은 GitHub나 채팅에 올리지 않습니다.

| 변수 | 설정할 값 |
|---|---|
| `AUTH_SESSION_SECRET` | 무작위 32바이트 이상의 값. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`로 생성 가능 |
| `ADMIN_PASSWORD` | 관리자 로그인에 사용할 현재 비밀번호. 운영용은 12자 이상 권장. 부서별 발급 비밀번호와 별도 |
| `SUPABASE_URL` | 현재 Supabase 프로젝트 URL |
| `SUPABASE_SECRET_KEY` | Supabase 서버 전용 secret key. 기존 service_role 키를 사용하는 경우 `SUPABASE_SERVICE_ROLE_KEY`도 지원 |

`ADMIN_PASSWORD_HASH`에 scrypt 해시를 설정하면 `ADMIN_PASSWORD`보다 우선합니다. 이 변수들에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 기존 publishable/anon 키는 서버 전용 키의 대체품이 아닙니다.

3. 별도 테스트 DB에서 `supabase/migrations/20261028_secure_department_review.sql`을 실행해 확인합니다. 이 SQL은 제안·평가·비밀번호를 삭제하거나 초기화하지 않습니다. 테이블 접근 권한을 제한하고 저장 함수를 생성하며, 이관 요청용 컬럼이 없으면 추가합니다. 운영 DB에 사용자가 직접 확인한 후 적용해야 합니다.
4. 보안 브랜치 Preview 배포에서 관리자 로그인, 부서 로그인, 담당 제안·첨부 다운로드, 임시 저장, 최종 제출, 비밀번호 변경 및 로그아웃을 확인합니다. 인증 쿠키가 Secure이므로 HTTPS를 사용합니다.
5. 운영 전환은 짧은 점검 시간에 진행합니다. 기존 버전과 새 버전이 같은 운영 DB를 사용하는 경우 DB의 익명 접근 권한을 차단하는 순간 구버전이 DB에 접근할 수 없으므로, DB 보안 SQL 적용과 새 배포 승격을 연달아 진행합니다.
6. 운영 적용 후 새 로그인을 안내합니다. 부서 평가 1건을 담당자 동의하에 저장하고 DB에서 확인한 뒤 전체 심사를 시작합니다.

## 검증과 한계

- `node scripts/verify_proposal_sources.cjs`: 제안 134건·첨부 152개 원본 해시와 연결 검증.
- `node scripts/verify_review_security.cjs`: 프로덕션 빌드 후 실행. 임시 디렉터리와 가짜 로컬 Supabase를 사용하므로 실제 운영 DB에는 접속하지 않습니다.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: 타입 검사.
- `node node_modules/next/dist/bin/next build`: 빌드 검사.

HTTP 통합 테스트는 API 동작을 검증하며 실제 PostgreSQL에서의 마이그레이션 실행을 대신하지 않습니다. 운영 SQL은 아직 실행하지 않았습니다. 로그인 시도 제한은 현재 서버 인스턴스별 제한이므로 Vercel Firewall에서도 로그인 API의 속도 제한을 설정해야 합니다. 배포 규모가 커지면 공유 저장소 기반 제한으로 보강해야 합니다.

기존 평가 API는 ‘최종 제출’ 이후 부서의 재수정을 차단합니다. 수정이 필요하면 관리자가 처리합니다. 1차 심사 고정 점수 자동 입력과 나머지 1차 심사 저장 정합성 개선은 이번 부서 심사 인증 작업의 완료 범위에 포함하지 않습니다. 1차 심사 시작 전 별도 수정이 필요합니다.

현재 Git 이력과 과거 공개 파일에 남아 있는 이전 비밀번호는 이번 변경으로 삭제하지 않습니다. 이미 변경한 비밀번호는 유지하며 이전에 공개된 값은 재사용하지 않습니다.

## 복구

SQL 실행은 BEGIN/COMMIT 트랜잭션으로 묶여 있습니다. 적용 전 백업과 Vercel 이전 배포를 확보합니다. 새 버전에서 문제가 생겨도 익명 DB 쓰기 권한을 다시 열지 말고, 점검 모드에서 원인을 수정합니다. 제안서와 첨부 원본은 이 변경에서 수정하지 않습니다.

참고: [Next.js 인증 안내](https://nextjs.org/docs/14/app/building-your-application/authentication), [Supabase 데이터 접근 보호](https://supabase.com/docs/guides/database/secure-data)
