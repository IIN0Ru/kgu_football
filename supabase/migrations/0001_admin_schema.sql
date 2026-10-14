-- =====================================================================
-- KGU Football 관리자 입력 DB (Supabase) — 2026-10-14, GPT 검토 반영판
-- 실행: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (한 번). 같은 파일을 다시 돌려도 안전하게 작성
--
-- 원칙
-- 1) 누구나 읽기(공개 자료), 쓰기는 운영진(private.admins)만. 행 단위 보안(RLS) + 표 권한(GRANT) 둘 다로 막음
--    (화면에 버튼이 없는 것과 API 권한은 별개 — REST/RPC 로 직접 불러도 막혀야 함)
-- 2) 수정자·수정 시각·버전은 DB 가 정함(요청값 무시). 감사 기록은 같은 처리(트랜잭션) 안에서 AFTER 트리거가 남김
--    감사 기록은 운영진이 고칠 수 없지만, DB 소유자(대시보드)는 고칠 수 있음 → '완전한 위조 방지 기록'은 아님
-- 3) 지우기: 경기·글은 보관(archived_at)만. 영구 삭제는 대시보드에서 개발자만 (사용자 결정 2026-10-14)
-- 4) 비밀 키(sb_secret / service_role)는 사이트·저장소에 두지 않음. 공개 사이트는 이 DB 를 직접 읽지 않고,
--    publish 워크플로가 publishable 키로 public_snapshot() 을 불러 JSON 을 만들어 정적 배포
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;
-- 정책 안에서 private.is_admin() 을 부르려면 스키마 사용 권한이 필요 (private 는 Data API 로 노출되지 않음).
-- 방문자(anon)도 읽기 정책에서 is_admin() 을 평가하므로 함께 줌 (anon 에게는 항상 false)
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------------
-- 운영진 명단 (비공개 스키마: REST 로 보이지 않음). 추가·삭제는 대시보드 SQL 로만
-- ---------------------------------------------------------------------
create table if not exists private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 40),
  added_at timestamptz not null default now()
);
revoke all on private.admins from public, anon, authenticated;

-- 지금 요청한 사람이 운영진인지. 사용자 ID 를 인자로 받지 않고 auth.uid() 로만 판단
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 공개 자료 표
-- ---------------------------------------------------------------------
create table if not exists public.teams (
  id bigint generated always as identity primary key,
  short_name text not null unique check (short_name = btrim(short_name) and length(short_name) between 1 and 20),
  is_ours boolean not null default false,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create unique index if not exists teams_one_ours on public.teams (is_ours) where is_ours;

create table if not exists public.players (
  id bigint generated always as identity primary key,
  name text not null check (name = btrim(name) and length(name) between 1 and 30), -- 동명이인 허용 → 이름은 유일하지 않음
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.matches (
  id bigint generated always as identity primary key,
  season int not null check (season between 2000 and 2100),
  competition text not null check (competition = btrim(competition) and length(competition) between 1 and 60),
  round_label text check (round_label is null or (round_label = btrim(round_label) and length(round_label) between 1 and 30)),
  match_date date not null,                                        -- 한국 날짜
  kickoff text check (kickoff is null or kickoff ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'), -- 한국 시각 'HH:MM', 모르면 null
  venue text check (venue is null or (venue = btrim(venue) and length(venue) between 1 and 60)),
  home_team_id bigint not null references public.teams (id),
  away_team_id bigint not null references public.teams (id),
  status text not null default 'scheduled' check (status in ('scheduled', 'finished', 'postponed', 'cancelled')),
  home_score int check (home_score between 0 and 99),
  away_score int check (away_score between 0 and 99),
  -- 선수 기록에 없는 '경기대' 득점 (상대 자책골, 득점자 미확인 등). 상대 팀 기준이 아님
  kgu_unattributed_goals int not null default 0 check (kgu_unattributed_goals between 0 and 99),
  -- 선수 기록 상태: 대기(KUSF 기록 미공개) / 완료 / 없음(몰수·기록 미제공 등, 사유 필수)
  records_status text not null default 'pending' check (records_status in ('pending', 'complete', 'unavailable')),
  records_note text check (records_note is null or length(records_note) <= 200),
  archived_at timestamptz,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint different_teams check (home_team_id <> away_team_id),
  -- 종료 경기만 점수가 있고, 종료 경기는 반드시 양 팀 점수가 있음
  constraint score_matches_status check (
    (status = 'finished' and home_score is not null and away_score is not null)
    or (status <> 'finished' and home_score is null and away_score is null)
  ),
  constraint unavailable_needs_note check (records_status <> 'unavailable' or records_note is not null),
  constraint one_fixture unique (season, competition, match_date, home_team_id, away_team_id)
);

create table if not exists public.player_records (
  id bigint generated always as identity primary key,
  match_id bigint not null references public.matches (id) on delete cascade,
  player_id bigint not null references public.players (id),
  shirt_number int check (shirt_number between 0 and 99), -- 그 경기의 등번호
  goals int not null default 0 check (goals between 0 and 30),
  assists int not null default 0 check (assists between 0 and 30),
  yellow int not null default 0 check (yellow between 0 and 2),
  red int not null default 0 check (red between 0 and 1),
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint one_line_per_player unique (match_id, player_id)
);

-- KUSF 공식 순위표를 그대로 저장 (우리가 계산하지 않음). 승점이 승×3+무와 다르면 저장은 하되 화면에서 경고,
-- 공식 조정이 있으면 points_adjustment 에 적음
create table if not exists public.standings (
  season int not null check (season between 2000 and 2100),
  competition text not null check (length(btrim(competition)) between 1 and 60),
  group_label text not null default '' check (length(group_label) <= 30),
  team_id bigint not null references public.teams (id),
  rank int not null check (rank between 1 and 99),
  played int not null check (played between 0 and 99),
  won int not null check (won >= 0),
  drawn int not null check (drawn >= 0),
  lost int not null check (lost >= 0),
  goals_for int not null check (goals_for >= 0),
  goals_against int not null check (goals_against >= 0),
  points int not null,
  points_adjustment int not null default 0,
  yellow int not null default 0 check (yellow >= 0),
  red int not null default 0 check (red >= 0),
  source text not null default 'KUSF 대학스포츠' check (length(source) between 1 and 60),
  checked_on date not null default current_date,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (season, competition, group_label, team_id),
  constraint played_adds_up check (played = won + drawn + lost)
);

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('blog', 'magazine')),
  title text not null check (title = btrim(title) and length(title) between 1 and 120),
  summary text check (summary is null or length(summary) <= 300),
  category text not null default '인터뷰' check (length(btrim(category)) between 1 and 20),
  source text check (source is null or length(source) <= 30),
  published_on date,
  -- 바깥 링크만 (https). 화면에는 글자로만 보여주고 HTML 은 받지 않음
  url text not null unique check (url ~ '^https://[^[:space:]<>"]+$' and length(url) <= 500),
  position int not null default 0,
  archived_at timestamptz,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- 공개 자료 전체 버전 번호 (바뀔 때마다 +1). 공개 사이트 반영 여부를 이 번호로 비교
create table if not exists public.content_revision (
  id int primary key default 1 check (id = 1),
  revision bigint not null default 0,
  changed_at timestamptz not null default now()
);
insert into public.content_revision (id) values (1) on conflict do nothing;

-- 같은 저장 요청이 두 번 들어와도 한 번만 처리 (버튼 두 번 누르기·재시도)
create table if not exists private.request_log (
  request_id uuid primary key,
  at timestamptz not null default now()
);
revoke all on private.request_log from public, anon, authenticated;

-- 요청 번호를 처음 보면 true, 이미 처리한 번호면 false (저장 함수가 부름)
create or replace function private.claim_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_request_id is null then
    raise exception '요청 번호가 없어요' using errcode = '22004';
  end if;
  insert into private.request_log (request_id) values (p_request_id) on conflict do nothing;
  return found;
end;
$$;
revoke all on function private.claim_request(uuid) from public;
grant execute on function private.claim_request(uuid) to authenticated;

-- 감사 기록 (비공개 스키마, 운영진은 public.recent_changes() 로만 읽음)
create table if not exists private.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  table_name text not null,
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  row_key jsonb,
  before jsonb,
  after jsonb
);
revoke all on private.audit_log from public, anon, authenticated;

-- 사이트 반영 요청 기록 (Edge Function 이 debounce 에 씀)
create table if not exists private.publish_requests (
  id bigint generated always as identity primary key,
  requested_at timestamptz not null default now(),
  requested_by uuid,
  revision bigint not null
);
revoke all on private.publish_requests from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 트리거: 수정 메타데이터(BEFORE) / 감사 기록(AFTER, 행) / 버전 번호(AFTER, 문장)
-- ---------------------------------------------------------------------
create or replace function private.stamp_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- 요청에 들어온 값은 무시하고 DB 가 정함
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  if tg_op = 'INSERT' then
    new.version := 1;
  else
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  k jsonb;
begin
  k := case
    when tg_table_name = 'standings' then jsonb_build_object(
      'season', r -> 'season', 'competition', r -> 'competition', 'group_label', r -> 'group_label', 'team_id', r -> 'team_id')
    else jsonb_build_object('id', r -> 'id')
  end;
  insert into private.audit_log (actor_id, table_name, op, row_key, before, after)
  values (
    (select auth.uid()), tg_table_name, tg_op, k,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

create or replace function private.bump_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.content_revision set revision = revision + 1, changed_at = now() where id = 1;
  return null;
end;
$$;

revoke all on function private.stamp_row() from public;
revoke all on function private.audit_row() from public;
revoke all on function private.bump_revision() from public;

do $$
declare t text;
begin
  foreach t in array array['teams', 'players', 'matches', 'player_records', 'standings', 'posts'] loop
    execute format('drop trigger if exists a_stamp on public.%I', t);
    execute format('create trigger a_stamp before insert or update on public.%I for each row execute function private.stamp_row()', t);
    execute format('drop trigger if exists z_audit on public.%I', t);
    execute format('create trigger z_audit after insert or update or delete on public.%I for each row execute function private.audit_row()', t);
    execute format('drop trigger if exists z_revision on public.%I', t);
    execute format('create trigger z_revision after insert or update or delete on public.%I for each statement execute function private.bump_revision()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 표 권한(GRANT) — RLS 보다 먼저 검사됨. 필요한 것만 명시
-- ---------------------------------------------------------------------
revoke all on public.teams, public.players, public.matches, public.player_records, public.standings, public.posts,
  public.content_revision from public, anon, authenticated;

grant select on public.teams, public.players, public.matches, public.player_records, public.standings, public.posts,
  public.content_revision to anon, authenticated;
-- 운영진 쓰기 (RLS 가 운영진만 통과시킴). 경기·글·학교·선수는 DELETE 권한 자체가 없음(보관만)
grant insert, update on public.teams, public.players, public.matches, public.posts to authenticated;
grant insert, update, delete on public.player_records, public.standings to authenticated;
-- id 는 identity(always) 라 시퀀스 권한 불필요. content_revision 은 트리거(security definer)만 바꿈

-- ---------------------------------------------------------------------
-- 행 단위 보안 (RLS)
-- ---------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.player_records enable row level security;
alter table public.standings enable row level security;
alter table public.posts enable row level security;
alter table public.content_revision enable row level security;

do $$
declare t text;
begin
  foreach t in array array['teams', 'players', 'matches', 'player_records', 'standings', 'posts', 'content_revision'] loop
    execute format('drop policy if exists read_all on public.%I', t);
    execute format('drop policy if exists admin_insert on public.%I', t);
    execute format('drop policy if exists admin_update on public.%I', t);
    execute format('drop policy if exists admin_delete on public.%I', t);
  end loop;
end $$;

-- 읽기: 보관된 경기·글은 방문자에게 숨기고 운영진에게만 보임
create policy read_all on public.teams for select to anon, authenticated using (true);
create policy read_all on public.players for select to anon, authenticated using (true);
create policy read_all on public.player_records for select to anon, authenticated using (true);
create policy read_all on public.standings for select to anon, authenticated using (true);
create policy read_all on public.content_revision for select to anon, authenticated using (true);
create policy read_all on public.matches for select to anon, authenticated
  using (archived_at is null or (select private.is_admin()));
create policy read_all on public.posts for select to anon, authenticated
  using (archived_at is null or (select private.is_admin()));

-- 쓰기: INSERT 는 WITH CHECK, UPDATE 는 USING + WITH CHECK, DELETE 는 USING 을 각각 운영진으로
do $$
declare t text;
begin
  foreach t in array array['teams', 'players', 'matches', 'player_records', 'standings', 'posts'] loop
    execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select private.is_admin()))', t);
    execute format('create policy admin_update on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
  end loop;
  foreach t in array array['player_records', 'standings'] loop
    execute format('create policy admin_delete on public.%I for delete to authenticated using ((select private.is_admin()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 저장 함수: 경기 결과 + 선수 기록을 한 번에 (전부 저장되거나 전부 취소)
-- security invoker → 위 RLS 가 그대로 적용됨. 핵심 검사는 화면이 아니라 여기서 다시 함
-- p_players: [{"player_id": 3} 또는 {"name": "홍길동"}, "shirt_number": 7, "goals": 1, "assists": 0, "yellow": 0, "red": 0}, ...]
-- ---------------------------------------------------------------------
create or replace function public.save_match_result(
  p_match_id bigint,
  p_expected_version int,
  p_request_id uuid,
  p_status text,
  p_home_score int,
  p_away_score int,
  p_kgu_unattributed_goals int,
  p_records_status text,
  p_records_note text,
  p_players jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  m public.matches%rowtype;
  ours bigint;
  kgu_goals int;
  player_goals int := 0;
  p jsonb;
  pid bigint;
  new_version int;
begin
  if not (select private.is_admin()) then
    raise exception '운영진만 저장할 수 있어요' using errcode = '42501';
  end if;

  -- 같은 요청이 이미 처리됐으면 아무것도 하지 않음
  if not private.claim_request(p_request_id) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if not found then
    raise exception '경기를 찾을 수 없어요' using errcode = 'P0002';
  end if;
  if m.version <> p_expected_version then
    raise exception '다른 사람이 먼저 고쳤어요. 새로고침 후 다시 저장해 주세요' using errcode = 'PT409'; -- 409 Conflict (40001 은 PostgREST 가 재시도하므로 쓰지 않음)
  end if;

  select id into ours from public.teams where is_ours;

  -- 선수 기록이 '완료'면: 선수 득점 합 + 기록에 없는 경기대 득점 = 경기대 점수
  if p_status = 'finished' and p_records_status = 'complete' then
    kgu_goals := case when m.home_team_id = ours then p_home_score when m.away_team_id = ours then p_away_score end;
    select coalesce(sum((x ->> 'goals')::int), 0) into player_goals from jsonb_array_elements(coalesce(p_players, '[]')) x;
    if kgu_goals is null or player_goals + coalesce(p_kgu_unattributed_goals, 0) <> kgu_goals then
      raise exception '선수 득점 합(%) + 기록에 없는 득점(%)이 경기대 점수(%)와 달라요',
        player_goals, coalesce(p_kgu_unattributed_goals, 0), kgu_goals using errcode = '23514';
    end if;
  end if;

  update public.matches set
    status = p_status,
    home_score = p_home_score,
    away_score = p_away_score,
    kgu_unattributed_goals = coalesce(p_kgu_unattributed_goals, 0),
    records_status = p_records_status,
    records_note = nullif(btrim(coalesce(p_records_note, '')), '')
  where id = p_match_id
  returning version into new_version;

  -- 선수 줄은 통째로 바꿈 (붙여넣은 표가 기준)
  if p_players is not null then
    delete from public.player_records where match_id = p_match_id;
    for p in select * from jsonb_array_elements(p_players) loop
      pid := (p ->> 'player_id')::bigint;
      if pid is null then
        insert into public.players (name) values (btrim(p ->> 'name')) returning id into pid;
      end if;
      insert into public.player_records (match_id, player_id, shirt_number, goals, assists, yellow, red)
      values (
        p_match_id, pid, (p ->> 'shirt_number')::int,
        coalesce((p ->> 'goals')::int, 0), coalesce((p ->> 'assists')::int, 0),
        coalesce((p ->> 'yellow')::int, 0), coalesce((p ->> 'red')::int, 0)
      );
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'duplicate', false, 'version', new_version,
    'revision', (select revision from public.content_revision where id = 1));
end;
$$;
revoke all on function public.save_match_result(bigint, int, uuid, text, int, int, int, text, text, jsonb) from public, anon;
grant execute on function public.save_match_result(bigint, int, uuid, text, int, int, int, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 공개 스냅샷: 한 문장(같은 시점)으로 공개 자료 전체 + 버전 번호. publish 워크플로가 publishable 키로 부름
-- security invoker → 방문자 권한으로 읽으므로 보관된 경기·글은 자동으로 빠짐
-- ---------------------------------------------------------------------
create or replace function public.public_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'revision', (select revision from public.content_revision where id = 1),
    'changed_at', (select changed_at from public.content_revision where id = 1),
    'teams', coalesce((select jsonb_agg(to_jsonb(t) - 'updated_by' - 'updated_at' order by t.id) from public.teams t), '[]'),
    'players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.id) from public.players p), '[]'),
    'matches', coalesce((select jsonb_agg(to_jsonb(m) - 'updated_by' - 'updated_at' - 'archived_at' order by m.match_date, m.id)
                          from public.matches m where m.archived_at is null), '[]'),
    'player_records', coalesce((select jsonb_agg(to_jsonb(r) - 'updated_by' - 'updated_at' order by r.match_id, r.id)
                          from public.player_records r join public.matches m on m.id = r.match_id and m.archived_at is null), '[]'),
    'standings', coalesce((select jsonb_agg(to_jsonb(s) - 'updated_by' - 'updated_at' order by s.season, s.competition, s.group_label, s.rank)
                          from public.standings s), '[]'),
    'posts', coalesce((select jsonb_agg(to_jsonb(p) - 'updated_by' - 'updated_at' - 'archived_at' order by p.kind, p.published_on desc nulls last, p.position, p.id)
                          from public.posts p where p.archived_at is null), '[]')
  );
$$;
revoke all on function public.public_snapshot() from public;
grant execute on function public.public_snapshot() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 운영진용: 내가 운영진인지 / 최근 수정 기록 / 사이트 반영 요청
-- ---------------------------------------------------------------------
create or replace function public.whoami()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'is_admin', exists (select 1 from private.admins a where a.user_id = (select auth.uid())),
    'display_name', (select a.display_name from private.admins a where a.user_id = (select auth.uid()))
  );
$$;
revoke all on function public.whoami() from public, anon;
grant execute on function public.whoami() to authenticated;

create or replace function public.recent_changes(p_limit int default 50)
returns table (at timestamptz, actor text, table_name text, op text, row_key jsonb, before jsonb, after jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception '운영진만 볼 수 있어요' using errcode = '42501';
  end if;
  return query
    select l.at, coalesce(a.display_name, '(대시보드·시스템)'), l.table_name, l.op, l.row_key, l.before, l.after
    from private.audit_log l left join private.admins a on a.user_id = l.actor_id
    order by l.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;
revoke all on function public.recent_changes(int) from public, anon;
grant execute on function public.recent_changes(int) to authenticated;

-- 사이트 반영 요청 기록. Edge Function 이 로그인한 사용자 토큰으로 부르고, true 일 때만 GitHub 로 배포를 요청
-- 60초 안에 이미 요청이 있었으면 false (여러 번 눌러도 배포는 한 번)
create or replace function public.request_publish()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rev bigint;
  recent boolean;
begin
  if not (select private.is_admin()) then
    raise exception '운영진만 반영을 요청할 수 있어요' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('kgu_publish'));
  select revision into rev from public.content_revision where id = 1;
  select exists (select 1 from private.publish_requests where requested_at > now() - interval '60 seconds') into recent;
  if not recent then
    insert into private.publish_requests (requested_by, revision) values ((select auth.uid()), rev);
  end if;
  return jsonb_build_object('dispatch', not recent, 'revision', rev);
end;
$$;
revoke all on function public.request_publish() from public, anon;
grant execute on function public.request_publish() to authenticated;
