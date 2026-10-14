-- =========================================================
-- KGU Football 관리자 입력용 데이터베이스 (Supabase, 2026-10-14)
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 Run (한 번만)
-- 그다음 seed.sql 로 지금 사이트 자료를 옮긴다.
--
-- 원칙
-- - 누구나 읽기(사이트 방문자), 쓰기는 운영진(admins 표에 있는 로그인 계정)만: 행 단위 보안(RLS)
-- - 모든 수정은 audit_log 에 누가·언제·무엇을(바뀌기 전/후) 남김
-- - 비밀 키(service_role)는 사이트·저장소 어디에도 넣지 않음. 사이트는 공개용 anon 키만 씀
-- =========================================================

-- ---------- 운영진 ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,                       -- 화면에 보일 이름 (예: 이상인)
  added_at timestamptz not null default now()
);

-- 지금 로그인한 사람이 운영진인지 (RLS 규칙에서 씀)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- 경기 일정·결과 ----------
create table if not exists public.matches (
  id bigint generated always as identity primary key,
  season int not null default 2026,
  competition text not null,
  date date not null,                                   -- 한국 날짜
  time text check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),   -- 'HH:MM' 한국 시각, 모르면 null
  venue text,
  home text not null,
  away text not null,
  home_score int check (home_score >= 0),
  away_score int check (away_score >= 0),
  unattributed_goals int not null default 0 check (unattributed_goals >= 0), -- 선수 기록에 없는 경기대 득점(자책골 등)
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id),
  constraint scores_together check ((home_score is null) = (away_score is null)),
  constraint one_match_per_day unique (date, home, away)
);

-- ---------- 경기별 경기대 선수 기록 (KUSF '경기대 선수기록') ----------
create table if not exists public.player_records (
  id bigint generated always as identity primary key,
  match_id bigint not null references public.matches (id) on delete cascade,
  number int,
  name text not null,
  goals int not null default 0 check (goals >= 0),
  assists int not null default 0 check (assists >= 0),
  yellow int not null default 0 check (yellow >= 0),
  red int not null default 0 check (red >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id),
  constraint one_line_per_player unique (match_id, name)
);

-- ---------- 4권역 순위표 ----------
create table if not exists public.standings (
  season int not null default 2026,
  team text not null,
  rank int not null check (rank >= 1),
  played int not null check (played >= 0),
  points int not null,
  won int not null,
  drawn int not null,
  lost int not null,
  goals_for int not null,
  goals_against int not null,
  yellow int not null default 0,
  red int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id),
  primary key (season, team),
  constraint points_ok check (points = won * 3 + drawn),
  constraint played_ok check (played = won + drawn + lost)
);

-- ---------- 블로그·매거진 글 ----------
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('blog', 'magazine')),
  title text not null,
  summary text,
  category text not null default '인터뷰',
  source text,
  date date,
  href text not null unique check (href ~ '^https://'),
  position int not null default 0,  -- 같은 날짜(또는 날짜 없음)일 때 보여줄 순서, 작을수록 위
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id)
);

-- ---------- 수정 기록 ----------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  table_name text not null,
  action text not null,           -- INSERT / UPDATE / DELETE
  before jsonb,
  after jsonb
);

-- 수정할 때마다 updated_at·updated_by 를 맞추고, audit_log 에 남김
create or replace function public.touch_and_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := auth.uid();
  end if;
  insert into public.audit_log (user_id, table_name, action, before, after)
  values (
    auth.uid(),
    tg_table_name,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['matches', 'player_records', 'standings', 'posts'] loop
    execute format('drop trigger if exists touch_and_audit on public.%I', t);
    execute format(
      'create trigger touch_and_audit before insert or update or delete on public.%I
       for each row execute function public.touch_and_audit()', t);
  end loop;
end $$;

-- ---------- 권한 (행 단위 보안) ----------
alter table public.admins enable row level security;
alter table public.matches enable row level security;
alter table public.player_records enable row level security;
alter table public.standings enable row level security;
alter table public.posts enable row level security;
alter table public.audit_log enable row level security;

-- 운영진 표: 본인 줄만 읽기 (관리자 화면에서 '내가 운영진인지' 확인용). 추가·삭제는 대시보드에서만
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- 공개 자료: 누구나 읽기, 운영진만 쓰기
do $$
declare t text;
begin
  foreach t in array array['matches', 'player_records', 'standings', 'posts'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "admin write" on public.%I for all to authenticated
       using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- 수정 기록: 운영진만 읽기 (쓰기는 위 트리거만)
drop policy if exists "admin read audit" on public.audit_log;
create policy "admin read audit" on public.audit_log
  for select to authenticated using (public.is_admin());
