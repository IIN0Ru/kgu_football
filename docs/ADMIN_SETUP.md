# 관리자 입력 설정 안내 (Supabase)

관리자 화면(/admin)에서 운영진이 경기·기록·소식을 입력하기 위한 DB 준비 순서다. **개발자(저장소 주인)만** 한다.
비밀번호·비밀 키(`sb_secret_…`, service_role)는 이 문서·저장소·대화 어디에도 적지 않는다.

## 1. 프로젝트 만들기

1. https://supabase.com 가입 → New project
2. Region: **Northeast Asia (Seoul)**. DB 비밀번호는 본인만 보관
3. 만든 뒤 Project Settings → API Keys 에서 **Project URL** 과 **Publishable key(`sb_publishable_…`)** 를 확인 (이 두 값은 공개돼도 되는 값)

## 2. 로그인 설정 (이메일 + 비밀번호, 공개 가입 막기)

Authentication → Sign In / Providers

- Email: 켜기
- **Allow new users to sign up: 끄기** (운영진 계정은 개발자가 직접 만듦)
- 메일 발송이 필요 없게 계정을 만들 때 "Auto Confirm User" 를 체크 (기본 메일 발송은 팀원에게만, 시간당 2통이라 운영에 쓰지 않음)

## 3. 표 만들기와 지금 자료 옮기기

SQL Editor 에서 차례로 붙여넣고 Run

1. `supabase/migrations/0001_admin_schema.sql`
2. `supabase/seed.sql` (만드는 법: `npm run make:seed`)

둘 다 다시 실행해도 같은 결과가 나오게 만들어져 있다.

## 4. 운영진 계정 (개발자 1 + 운영진 2)

1. Authentication → Users → Add user → Create new user: 이메일·비밀번호 입력, Auto Confirm 체크
   - 비밀번호는 운영진에게 직접 전달하고 첫 로그인 뒤 바꾸게 안내
2. SQL Editor 에서 운영진으로 등록 (이메일·이름만 바꿔 실행)

```sql
insert into private.admins (user_id, display_name)
select id, '이름' from auth.users where email = 'someone@example.com'
on conflict (user_id) do nothing;
```

운영진에서 빼기: `delete from private.admins where user_id = (select id from auth.users where email = '…');`
비밀번호를 잊으면: Users 에서 해당 계정 → Reset password 대신 개발자가 새 비밀번호를 정해 전달

## 5. 지켜야 할 것

- 경기·글 **영구 삭제**는 관리자 화면에서 안 됨(보관·복원만). 꼭 지워야 하면 개발자가 Table Editor 에서
- 수정 기록(`private.audit_log`)은 운영진이 고칠 수 없지만 DB 소유자는 고칠 수 있다. 완전한 위조 방지 기록은 아님
- 무료 플랜은 7일 동안 활동이 적으면 정지된다. 공개 사이트는 저장소의 JSON 으로 보이므로 방문자에게는 영향 없음. 관리자 화면을 쓰려면 대시보드에서 다시 켬

## 6. 장애 복구

DB 가 사라지거나 꼬였을 때

1. 새 프로젝트(또는 같은 프로젝트) 에 `0001_admin_schema.sql` 실행
2. 저장소의 최신 `src/data/*.json` 으로 `npm run make:seed` → `seed.sql` 실행
3. 운영진 계정 다시 등록(4번)
4. 관리자 화면에서 '사이트에 반영' 으로 새 버전 배포

운영진 명단과 수정 기록은 복구되지 않는다 (사용자 결정 2026-10-14).

## 7. 개발용 시험

`npm run test:db` — 임시 Postgres + PostgREST 로 권한(방문자·일반 로그인·운영진), 저장 함수(득점 합 검사·전체 롤백·중복 요청·버전 충돌), 감사 기록, 왕복(JSON → DB → JSON 동일)을 시험한다. 실제 Supabase 에는 아무것도 하지 않는다. 로그인 서버 자체는 시험하지 않으므로 실제 프로젝트에서 한 번 로그인해 확인한다.
