-- =====================================================================
-- 0002 관리자 저장 무결성 (2026-10-14, GPT 리뷰 2-1·2-2·2-5 반영)
-- 0001 다음에 SQL Editor 에서 한 번 실행. 두 번 실행해도 안전
--
-- 바뀌는 것
-- 1) 점수·상태·선수 기록·순위표는 저장 함수로만 쓸 수 있음 (표에 직접 쓰는 권한을 거둠)
--    → "득점 합 = 점수", "순위표 경기대 줄 = 앞 N경기 결과" 를 화면이 아니라 DB 가 모든 쓰기 경로에서 보장
--    - matches: 운영진은 새 경기 추가(INSERT)와 보관(archived_at) 만 직접. 날짜·시각·장소·상태·점수는 save_match()
--    - player_records: save_match_result() 로만
--    - standings: replace_standings() 로만 (통째로 교체를 한 번에: 일부만 바뀌는 일 없음)
-- 2) 글 순서 바꾸기: reorder_posts() 한 번에 (여러 줄을 나눠 저장하다 중간에 실패하는 일 없음)
-- 3) 모든 저장 함수: 운영진 확인 · 같은 요청 한 번만(request_id) · 버전이 다르면 PT409(다른 사람이 먼저 고침)
-- 저장 함수는 표 권한을 거뒀으므로 security definer(소유자 권한)로 돌고, 맨 앞에서 운영진인지 직접 확인한다.
-- 수정 기록·버전 트리거는 그대로 동작 (auth.uid() 는 로그인 토큰에서 읽음)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) 직접 쓰기 권한 축소
-- ---------------------------------------------------------------------
revoke insert, update, delete on public.player_records, public.standings from authenticated;
revoke update on public.matches from authenticated;
grant update (archived_at) on public.matches to authenticated; -- 보관·되살리기만 직접 (버전 검사는 화면이 eq(version) 로)
-- matches INSERT(새 경기 추가)·teams·players·posts 는 0001 그대로

-- ---------------------------------------------------------------------
-- 내부 도우미: 운영진 확인
-- ---------------------------------------------------------------------
create or replace function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception '운영진만 저장할 수 있어요' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.require_admin() from public;
grant execute on function private.require_admin() to authenticated;

-- 내부 도우미: 경기대 득점 합 검사 (선수 기록 '완료'인 경기만)
create or replace function private.check_goal_sum(p_match_id bigint)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.matches%rowtype;
  ours bigint;
  kgu int;
  player_goals int;
begin
  select * into m from public.matches where id = p_match_id;
  if m.status <> 'finished' or m.records_status <> 'complete' then
    return;
  end if;
  select id into ours from public.teams where is_ours;
  kgu := case when m.home_team_id = ours then m.home_score when m.away_team_id = ours then m.away_score end;
  select coalesce(sum(goals), 0) into player_goals from public.player_records where match_id = p_match_id;
  if kgu is null or player_goals + m.kgu_unattributed_goals <> kgu then
    raise exception '선수 득점 합(%) + 기록에 없는 득점(%)이 경기대 점수(%)와 달라요',
      player_goals, m.kgu_unattributed_goals, kgu using errcode = '23514';
  end if;
end;
$$;
revoke all on function private.check_goal_sum(bigint) from public;

-- 내부 도우미: 순위표 경기대 줄 = 끝난 경기를 날짜순으로 앞에서부터 N경기 결과 (scripts/check-records.mjs 와 같은 계약)
create or replace function private.check_standings(p_season int, p_competition text, p_group_label text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ours bigint;
  s public.standings%rowtype;
  finished_count int;
  t record;
begin
  select id into ours from public.teams where is_ours;
  select * into s from public.standings
    where season = p_season and competition = p_competition and group_label = p_group_label and team_id = ours;
  if not found then
    raise exception '순위표에 경기대 줄이 없어요' using errcode = '23514';
  end if;
  select count(*) into finished_count from public.matches
    where season = p_season and status = 'finished' and archived_at is null;
  if s.played > finished_count then
    raise exception '순위표는 %경기인데 점수가 저장된 경기는 %경기예요. 점수를 먼저 저장해 주세요', s.played, finished_count
      using errcode = '23514';
  end if;
  select
    count(*) filter (where f > a) as won, count(*) filter (where f = a) as drawn, count(*) filter (where f < a) as lost,
    coalesce(sum(f), 0) as gf, coalesce(sum(a), 0) as ga
  into t
  from (
    select case when home_team_id = ours then home_score else away_score end as f,
           case when home_team_id = ours then away_score else home_score end as a
    from public.matches
    where season = p_season and status = 'finished' and archived_at is null
    order by match_date, id
    limit s.played
  ) x;
  if (t.won, t.drawn, t.lost, t.gf, t.ga) is distinct from (s.won, s.drawn, s.lost, s.goals_for, s.goals_against) then
    raise exception '경기대 줄(%승 %무 %패, %득점 %실점)이 저장된 앞 %경기 점수(%승 %무 %패, %득점 %실점)와 달라요',
      s.won, s.drawn, s.lost, s.goals_for, s.goals_against, s.played, t.won, t.drawn, t.lost, t.gf, t.ga
      using errcode = '23514';
  end if;
end;
$$;
revoke all on function private.check_standings(int, text, text) from public;

-- ---------------------------------------------------------------------
-- save_match_result: 선수 기록 저장 (0001 과 같은 인자) — 직접 쓰기 권한이 없어졌으므로 소유자 권한으로
-- 점수 정정도 여기서 함께 (p_home_score·p_away_score 를 새 값으로)
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
security definer
set search_path = ''
as $$
declare
  m public.matches%rowtype;
  p jsonb;
  pid bigint;
  new_version int;
begin
  perform private.require_admin();
  if not private.claim_request(p_request_id) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if not found then
    raise exception '경기를 찾을 수 없어요' using errcode = 'P0002';
  end if;
  if m.version <> p_expected_version then
    raise exception '다른 사람이 먼저 고쳤어요. 새로고침 후 다시 저장해 주세요' using errcode = 'PT409';
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

  -- 선수 줄은 통째로 바꿈 (붙여넣은 표가 기준). null 이면 그대로 둠
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

  perform private.check_goal_sum(p_match_id); -- 실패하면 위 모든 변경이 취소됨

  return jsonb_build_object('ok', true, 'duplicate', false, 'version', new_version,
    'revision', (select revision from public.content_revision where id = 1));
end;
$$;
revoke all on function public.save_match_result(bigint, int, uuid, text, int, int, int, text, text, jsonb) from public, anon;
grant execute on function public.save_match_result(bigint, int, uuid, text, int, int, int, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- save_match: 경기 탭 저장 (날짜·시각·장소·상태·점수). 선수 기록은 그대로 두고 득점 합 검사는 DB 가 함
-- ---------------------------------------------------------------------
create or replace function public.save_match(
  p_match_id bigint,
  p_expected_version int,
  p_request_id uuid,
  p_match_date date,
  p_kickoff text,
  p_venue text,
  p_status text,
  p_home_score int,
  p_away_score int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches%rowtype;
  new_version int;
begin
  perform private.require_admin();
  if not private.claim_request(p_request_id) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then
    raise exception '경기를 찾을 수 없어요' using errcode = 'P0002';
  end if;
  if m.version <> p_expected_version then
    raise exception '다른 사람이 먼저 고쳤어요. 새로고침 후 다시 저장해 주세요' using errcode = 'PT409';
  end if;
  if m.records_status = 'complete' and p_status <> 'finished' then
    raise exception '선수 기록이 저장된 경기는 ‘끝남’에서 다른 상태로 바꿀 수 없어요' using errcode = '23514';
  end if;

  update public.matches set
    match_date = p_match_date,
    kickoff = nullif(btrim(coalesce(p_kickoff, '')), ''),
    venue = nullif(btrim(coalesce(p_venue, '')), ''),
    season = extract(year from p_match_date)::int,
    status = p_status,
    home_score = case when p_status = 'finished' then p_home_score end,
    away_score = case when p_status = 'finished' then p_away_score end
  where id = p_match_id
  returning version into new_version;

  perform private.check_goal_sum(p_match_id);

  return jsonb_build_object('ok', true, 'duplicate', false, 'version', new_version,
    'revision', (select revision from public.content_revision where id = 1));
end;
$$;
revoke all on function public.save_match(bigint, int, uuid, date, text, text, text, int, int) from public, anon;
grant execute on function public.save_match(bigint, int, uuid, date, text, text, text, int, int) to authenticated;

-- ---------------------------------------------------------------------
-- replace_standings: 순위표 통째로 교체 (한 번에)
-- p_expected: 화면이 불러온 순위표의 'team_id:version' 을 team_id 순으로 쉼표로 이은 글 (빈 표는 '')
--             지금 DB 와 다르면 다른 사람이 먼저 고친 것 → PT409
-- p_rows: [{"team_id":1,"rank":1,"played":9,"won":8,"drawn":1,"lost":0,"goals_for":30,"goals_against":12,"points":25,"yellow":20,"red":0}, ...]
--         승점 조정(points_adjustment)은 DB 가 승점 − (승×3+무) 로 계산
-- ---------------------------------------------------------------------
create or replace function public.replace_standings(
  p_season int,
  p_competition text,
  p_group_label text,
  p_expected text,
  p_request_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_key text;
  r jsonb;
  n int := 0;
begin
  perform private.require_admin();
  if not private.claim_request(p_request_id) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception '순위표가 비어 있어요' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('kgu_standings'));
  select coalesce(string_agg(team_id || ':' || version, ',' order by team_id), '') into current_key
    from public.standings where season = p_season and competition = p_competition and group_label = p_group_label;
  if current_key <> coalesce(p_expected, '') then
    raise exception '다른 사람이 먼저 순위표를 고쳤어요. 새로고침 후 다시 저장해 주세요' using errcode = 'PT409';
  end if;

  delete from public.standings
    where season = p_season and competition = p_competition and group_label = p_group_label
      and team_id not in (select (x ->> 'team_id')::bigint from jsonb_array_elements(p_rows) x);
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.standings (season, competition, group_label, team_id, rank, played, won, drawn, lost,
      goals_for, goals_against, points, points_adjustment, yellow, red, checked_on)
    values (p_season, p_competition, p_group_label, (r ->> 'team_id')::bigint, (r ->> 'rank')::int, (r ->> 'played')::int,
      (r ->> 'won')::int, (r ->> 'drawn')::int, (r ->> 'lost')::int, (r ->> 'goals_for')::int, (r ->> 'goals_against')::int,
      (r ->> 'points')::int, (r ->> 'points')::int - ((r ->> 'won')::int * 3 + (r ->> 'drawn')::int),
      coalesce((r ->> 'yellow')::int, 0), coalesce((r ->> 'red')::int, 0), (now() at time zone 'Asia/Seoul')::date)
    on conflict (season, competition, group_label, team_id) do update set
      rank = excluded.rank, played = excluded.played, won = excluded.won, drawn = excluded.drawn, lost = excluded.lost,
      goals_for = excluded.goals_for, goals_against = excluded.goals_against, points = excluded.points,
      points_adjustment = excluded.points_adjustment, yellow = excluded.yellow, red = excluded.red, checked_on = excluded.checked_on;
    n := n + 1;
  end loop;

  perform private.check_standings(p_season, p_competition, p_group_label); -- 실패하면 위 모든 변경이 취소됨

  return jsonb_build_object('ok', true, 'duplicate', false, 'teams', n,
    'revision', (select revision from public.content_revision where id = 1));
end;
$$;
revoke all on function public.replace_standings(int, text, text, text, uuid, jsonb) from public, anon;
grant execute on function public.replace_standings(int, text, text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- reorder_posts: 같은 종류 글의 순서를 한 번에. p_ids 는 원하는 순서, p_versions 는 화면이 불러온 각 글의 버전(같은 순서)
-- ---------------------------------------------------------------------
create or replace function public.reorder_posts(p_request_id uuid, p_ids bigint[], p_versions int[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  i int;
  v int;
begin
  perform private.require_admin();
  if not private.claim_request(p_request_id) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 or array_length(p_ids, 1) <> array_length(p_versions, 1) then
    raise exception '순서 목록이 비었거나 버전 수가 맞지 않아요' using errcode = '22023';
  end if;
  for i in 1 .. array_length(p_ids, 1) loop
    select version into v from public.posts where id = p_ids[i] for update;
    if not found or v <> p_versions[i] then
      raise exception '다른 사람이 먼저 글을 고쳤어요. 새로고침 후 다시 해 주세요' using errcode = 'PT409';
    end if;
  end loop;
  for i in 1 .. array_length(p_ids, 1) loop
    update public.posts set position = i - 1 where id = p_ids[i] and position is distinct from i - 1;
  end loop;
  return jsonb_build_object('ok', true, 'duplicate', false,
    'revision', (select revision from public.content_revision where id = 1));
end;
$$;
revoke all on function public.reorder_posts(uuid, bigint[], int[]) from public, anon;
grant execute on function public.reorder_posts(uuid, bigint[], int[]) to authenticated;
