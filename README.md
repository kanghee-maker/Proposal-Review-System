# Proposal-Review-System

## 0차 부서 평가 통계 배포

1. Vercel의 기존 서버 환경 변수 `SUPABASE_SERVICE_ROLE_KEY`를 사용합니다. Supabase SQL Editor에서 `supabase/admin_auth.sql`을 실행하고, 안내된 SQL로 관리자 비밀번호를 등록합니다. 배포 환경에서는 HTTPS로 접속합니다.
2. 환경 변수를 적용한 배포에서 관리자와 1차 심사위원의 로그인 및 회차 조회를 확인합니다.
3. 기존 Supabase SQL Editor에서 `supabase_schema.sql`의 마지막 RLS 블록을 적용합니다. 기존 행을 보존하면서 평가 결과와 부서 인증 데이터의 공개 API 접근을 차단합니다. 적용 후 관리자 통계와 1차 심사위원 화면을 다시 확인합니다. 새 데이터베이스에는 스키마 전체를 적용합니다.
4. 관리자 모드의 **0차 평가 통계** 메뉴에서 회차를 선택하고 **통계 인쇄** 또는 **종합 결과 엑셀 다운로드**를 사용합니다.
