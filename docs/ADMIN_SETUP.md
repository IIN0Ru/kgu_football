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

## 5. 사이트 반영 연결 (GitHub 토큰 + 중계 함수)

관리자 화면의 '사이트에 반영' 버튼 → Supabase 중계 함수 `request-publish` → GitHub `publish.yml` 실행 → 자료 커밋 → 배포

### 5-1. GitHub 토큰 만들기 (저장소 하나, 워크플로 실행 권한만)

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Token name: `kgu-football-publish`, Expiration: 최대 1년 (만료 전에 새로 만들어 5-3 에서 바꿔 넣기)
3. Repository access: **Only select repositories → IIN0Ru/kgu_football**
4. Permissions → Repository permissions → **Actions: Read and write** (나머지는 건드리지 않음. Metadata: Read 는 자동)
5. Generate → 나온 `github_pat_…` 를 복사 (다시 볼 수 없음). **Claude 나 저장소에 붙여넣지 않음**

### 5-2. 중계 함수 만들기

1. Supabase → Edge Functions → Deploy a new function → **Via Editor**
2. 함수 이름: `request-publish`
3. 편집기 내용을 지우고 `supabase/functions/request-publish/index.ts` 전체를 붙여넣기 → Deploy
4. 함수 설정(Details)에서 **Verify JWT** 는 켜 둔 그대로 (로그인한 사람만 부를 수 있음. 운영진 여부는 함수가 DB 로 다시 확인)

### 5-3. 토큰을 비밀값으로 넣기

Edge Functions → Secrets → Add new secret

- Name: `GITHUB_DISPATCH_TOKEN`
- Value: 5-1 에서 복사한 `github_pat_…`

토큰이 새거나 의심되면: GitHub 에서 그 토큰 삭제 → 새로 만들어 5-3 다시. 권한이 이 저장소의 워크플로 실행뿐이라 새어도 코드·자료를 바꿀 수는 없다.

## 6. 관리자 화면 쓰는 법 (운영진용)

주소: https://iin0ru.github.io/kgu_football/admin (☰ 페이지 목록에는 없음, 검색에도 안 나옴)

1. 개발자가 알려 준 이메일·비밀번호로 로그인
2. 탭에서 고치고 **저장** → DB 에만 저장된 상태 (사이트는 아직 그대로)
3. 맨 위 **사이트에 반영** → 보통 2~4분 뒤 '사이트에 반영됐어요'. 여러 번 눌러도 1분 안의 요청은 한 번만 배포됨
4. 10분이 지나도 '반영이 늦어지고 있어요'면 개발자에게 알림 (개발자 GitHub 메일로 실패 알림이 감)

| 탭 | 하는 일 |
|---|---|
| 경기 | 상태(예정·끝남·연기·취소)·점수·날짜·시각·장소 고치기, 경기 추가, 보관(숨기기)·되살리기. 시각을 비우면 사이트에 '시간 확인 중' |
| 선수 기록 | 경기를 고르고 KUSF '경기대 선수기록' 표를 **머리줄(선수명·득점 …)까지** 복사해 붙여 넣기 → 미리보기에서 득점 합 = 경기대 점수 확인 → 저장. 상대 자책골 등은 '기록에 없는 득점' + 사유. 처음 보는 이름은 '새 선수'로 표시(오타 확인) |
| 순위표 | KUSF 순위표를 머리줄까지 붙여 넣기 → 바뀐 칸은 빨간 글자 → 저장하면 표 전체 교체 |
| 글 | 블로그·매거진 글 추가·고치기·보관/되살리기. 매거진처럼 날짜 없는 글은 화살표로 순서 |
| 수정 기록 | 누가 언제 무엇을 바꿨는지, 사이트에 반영됐는지 |

- 두 사람이 같은 것을 동시에 고치면 나중 사람은 '다른 사람이 먼저 고쳤어요'가 나옴 → 새로 불러온 뒤 다시
- 붙여 넣은 글은 저장에 실패하거나 새로고침해도 칸에 남음 (창을 닫으면 지워짐)

## 7. 지켜야 할 것

- 경기·글 **영구 삭제**는 관리자 화면에서 안 됨(보관·복원만). 꼭 지워야 하면 개발자가 Table Editor 에서
- 수정 기록(`private.audit_log`)은 운영진이 고칠 수 없지만 DB 소유자는 고칠 수 있다. 완전한 위조 방지 기록은 아님
- 무료 플랜은 7일 동안 활동이 적으면 정지된다. 공개 사이트는 저장소의 JSON 으로 보이므로 방문자에게는 영향 없음. 관리자 화면을 쓰려면 대시보드에서 다시 켬

## 8. 장애 복구

DB 가 사라지거나 꼬였을 때

1. 새 프로젝트(또는 같은 프로젝트) 에 `0001_admin_schema.sql` 실행
2. 저장소의 최신 `src/data/*.json` 으로 `npm run make:seed` → `seed.sql` 실행
3. 운영진 계정 다시 등록(4번)
   (복구한 DB 는 버전 번호가 사이트보다 작아질 수 있음 — 관리자 화면은 버전이 '다르면' 반영 전으로 보고, 반영 뒤 사이트 버전이 바뀐 것까지 확인함)
4. 관리자 화면에서 '사이트에 반영' 으로 새 버전 배포

운영진 명단과 수정 기록은 복구되지 않는다 (사용자 결정 2026-10-14).

## 9. 개발용 시험

`npm run test:db` — 임시 Postgres + PostgREST 로 권한(방문자·일반 로그인·운영진), 저장 함수(득점 합 검사·전체 롤백·중복 요청·버전 충돌), 감사 기록, 왕복(JSON → DB → JSON 동일), 내보내기(바뀐 파일만 쓰기·급감/접속 실패 시 파일 유지)를 시험한다. 실제 Supabase 에는 아무것도 하지 않는다. 로그인 서버 자체는 시험하지 않으므로 실제 프로젝트에서 한 번 로그인해 확인한다.

`npm run test:parse` — 관리자 화면의 붙여넣기 읽기(머리줄로 칸 찾기, 다른 학교 선수 빼기, 잘못된 숫자·중복 줄, 순위표 경기 수 검사) 시험.

`npm run dev:admin` — 위와 같은 임시 DB 에 지금 자료를 넣고, '로컬 시험 운영진'으로 들어간 개발 서버를 띄운다 (http://localhost:5173/kgu_football/admin). 저장·충돌·붙여넣기를 실제 DB 없이 시험할 수 있다. 시험용 토큰은 개발 서버에서만 쓰이고 배포 빌드에는 들어가지 않는다. '사이트에 반영'은 동작하지 않는다.
