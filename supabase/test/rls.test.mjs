/**
 * 권한·저장 함수 시험 (scripts/test-db.sh 가 실행). REST 로 방문자 / 일반 로그인 / 운영진을 흉내 냄
 */
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { execSync } from 'node:child_process'

const API = process.env.API
const SECRET = process.env.JWT_SECRET
const sql = (q) => execSync(`${process.env.PSQL} -At -c ${JSON.stringify(q)}`, { encoding: 'utf8' }).trim()

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function jwt(claims) {
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64({ ...claims, exp: Math.floor(Date.now() / 1000) + 600 })
  const sig = createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}

const ADMIN = randomUUID()
const OTHER = randomUUID() // 로그인했지만 운영진 아님
sql(`insert into auth.users (id, email) values ('${ADMIN}', 'admin@test'), ('${OTHER}', 'other@test')`)
sql(`insert into private.admins (user_id, display_name) values ('${ADMIN}', '시험 운영진')`)

const tokens = {
  anon: jwt({ role: 'anon' }),
  other: jwt({ role: 'authenticated', sub: OTHER }),
  admin: jwt({ role: 'authenticated', sub: ADMIN }),
}

async function call(who, method, path, body, extra = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${tokens[who]}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: res.status, json }
}
const denied = (r, msg) => assert.ok(r.status === 401 || r.status === 403 || r.status === 404, `${msg}: ${r.status} ${JSON.stringify(r.json)}`)
const revision = () => Number(sql('select revision from public.content_revision'))
let n = 0
const ok = (name) => console.log(`  ✓ ${++n}. ${name}`)

// ---------- 방문자 ----------
{
  const r = await call('anon', 'GET', '/matches?select=id')
  assert.equal(r.status, 200)
  assert.ok(r.json.length >= 10)
  ok('방문자: 경기 읽기')
  denied(await call('anon', 'POST', '/teams', { short_name: '해킹대' }), '방문자 학교 추가')
  denied(await call('anon', 'PATCH', '/matches?id=gt.0', { venue: 'x' }), '방문자 경기 수정')
  denied(await call('anon', 'DELETE', '/posts?id=gt.0'), '방문자 글 삭제')
  denied(await call('anon', 'PATCH', '/content_revision?id=eq.1', { revision: 0 }), '방문자 버전 조작')
  ok('방문자: 쓰기·삭제·버전 조작 모두 막힘')
  denied(await call('anon', 'POST', '/rpc/save_match_result', {}), '방문자 저장 함수')
  denied(await call('anon', 'POST', '/rpc/recent_changes', {}), '방문자 수정 기록')
  denied(await call('anon', 'POST', '/rpc/request_publish', {}), '방문자 반영 요청')
  ok('방문자: 운영진 함수 호출 막힘')
  for (const p of ['/admins', '/audit_log', '/request_log', '/publish_requests', '/rpc/is_admin', '/rpc/claim_request']) {
    const r2 = await call('anon', 'GET', p)
    assert.ok(r2.status === 404 || r2.status === 401 || r2.status === 403, `${p} 가 보이면 안 됨: ${r2.status}`)
  }
  ok('방문자: 비공개 표·함수(운영진 명단·감사 기록 등)는 REST 에 없음')
  const snap = await call('anon', 'POST', '/rpc/public_snapshot', {})
  assert.equal(snap.status, 200)
  assert.ok(snap.json.matches.length >= 10 && snap.json.posts.length >= 10 && typeof snap.json.revision === 'number')
  assert.ok(!JSON.stringify(snap.json).includes('updated_by'), '스냅샷에 수정자 ID 가 들어가면 안 됨')
  ok('방문자: 공개 스냅샷 읽기 (수정자 ID 없음)')
}

// ---------- 로그인했지만 운영진 아님 ----------
{
  const who = await call('other', 'POST', '/rpc/whoami', {})
  assert.equal(who.json.is_admin, false)
  ok('일반 로그인: whoami → 운영진 아님')
  const ins = await call('other', 'POST', '/teams', { short_name: '해킹대' })
  assert.equal(ins.status, 403, JSON.stringify(ins.json))
  const upd = await call('other', 'PATCH', '/matches?id=gt.0', { venue: '조작' })
  denied(upd, '일반 로그인 경기 수정 (0002: 경기 직접 수정 권한 없음)')
  assert.equal(Number(sql(`select count(*) from public.matches where venue = '조작'`)), 0)
  const del = await call('other', 'DELETE', '/player_records?id=gt.0')
  denied(del, '일반 로그인 선수 기록 삭제 (0002: 직접 쓰기 권한 없음)')
  ok('일반 로그인: 추가·수정·삭제 모두 반영 안 됨')
  denied(await call('other', 'POST', '/rpc/save_match_result', { p_match_id: 1 }), '일반 로그인 저장 함수')
  const sv = await call('other', 'POST', '/rpc/save_match_result', {
    p_match_id: 1, p_expected_version: 1, p_request_id: randomUUID(), p_status: 'finished', p_home_score: 0,
    p_away_score: 0, p_kgu_unattributed_goals: 0, p_records_status: 'pending', p_records_note: null, p_players: null,
  })
  assert.ok(sv.status >= 400, '일반 로그인은 저장 함수 실패해야 함')
  const rc = await call('other', 'POST', '/rpc/recent_changes', {})
  assert.ok(rc.status >= 400)
  const rp = await call('other', 'POST', '/rpc/request_publish', {})
  assert.ok(rp.status >= 400)
  ok('일반 로그인: 저장 함수·수정 기록·반영 요청 실패')
}

// ---------- 운영진 ----------
let postId
{
  const who = await call('admin', 'POST', '/rpc/whoami', {})
  assert.deepEqual(who.json, { is_admin: true, display_name: '시험 운영진' })
  ok('운영진: whoami')

  const rev0 = revision()
  const forged = randomUUID()
  const ins = await call('admin', 'POST', '/posts', {
    kind: 'blog', title: '시험 글', category: '공지', url: 'https://example.com/test-post', updated_by: forged, version: 99,
  })
  assert.equal(ins.status, 201, JSON.stringify(ins.json))
  postId = ins.json[0].id
  assert.equal(ins.json[0].updated_by, ADMIN, '수정자는 요청값이 아니라 로그인한 사람')
  assert.equal(ins.json[0].version, 1, '버전은 DB 가 정함')
  assert.ok(revision() > rev0, '전체 버전 번호가 올라가야 함')
  ok('운영진: 글 추가, 수정자·버전 위조 무시, 전체 버전 +1')

  const bad = await call('admin', 'POST', '/posts', { kind: 'blog', title: '나쁜 링크', url: 'javascript:alert(1)' })
  assert.equal(bad.status, 400)
  const blank = await call('admin', 'POST', '/posts', { kind: 'blog', title: '  ', url: 'https://example.com/x' })
  assert.equal(blank.status, 400)
  ok('운영진: https 아닌 링크·빈 제목 거부')

  // 버전 비교로 동시 수정 충돌 감지: 예전 버전으로 고치면 0줄
  const v1 = await call('admin', 'PATCH', `/posts?id=eq.${postId}&version=eq.1`, { title: '고친 제목' })
  assert.equal(v1.json.length, 1)
  assert.equal(v1.json[0].version, 2)
  const stale = await call('admin', 'PATCH', `/posts?id=eq.${postId}&version=eq.1`, { title: '늦은 수정' })
  assert.equal(stale.json.length, 0, '예전 버전으로는 수정되면 안 됨')
  ok('운영진: 버전이 다르면 수정 안 됨 (동시 수정 충돌)')

  const del = await call('admin', 'DELETE', `/posts?id=eq.${postId}`)
  denied(del, '운영진도 글 영구 삭제는 안 됨')
  const arch = await call('admin', 'PATCH', `/posts?id=eq.${postId}`, { archived_at: new Date().toISOString() })
  assert.equal(arch.json.length, 1)
  const anonSee = await call('anon', 'GET', `/posts?id=eq.${postId}`)
  assert.equal(anonSee.json.length, 0, '보관한 글은 방문자에게 안 보임')
  const adminSee = await call('admin', 'GET', `/posts?id=eq.${postId}`)
  assert.equal(adminSee.json.length, 1, '운영진에게는 보임(복원용)')
  ok('운영진: 영구 삭제 불가, 보관하면 방문자에게 숨김·운영진은 보임')

  denied(await call('admin', 'PATCH', '/content_revision?id=eq.1', { revision: 0 }), '운영진 버전 직접 조작')
  ok('운영진: 전체 버전 번호 직접 조작 불가')

  const changes = await call('admin', 'POST', '/rpc/recent_changes', { p_limit: 5 })
  assert.equal(changes.status, 200)
  assert.ok(changes.json.some((c) => c.table_name === 'posts' && c.actor === '시험 운영진'))
  ok('운영진: 수정 기록 읽기 (누가 바꿨는지 이름으로)')
}

// ---------- 저장 함수: 경기 결과 + 선수 기록 ----------
{
  // 10/9 홍익대 0:2 경기대 — 실제 자료에는 이제 선수 기록이 있으므로(2026-10-14 반영) 시험용으로 '대기' 상태로 되돌림
  sql(`delete from public.player_records where match_id = (select id from public.matches where match_date = '2026-10-09')`)
  sql(`update public.matches set records_status = 'pending' where match_date = '2026-10-09'`)
  const m = JSON.parse(sql(`select row_to_json(m) from public.matches m where match_date = '2026-10-09'`))
  assert.equal(m.records_status, 'pending')
  const base = {
    p_match_id: m.id, p_expected_version: m.version, p_status: 'finished', p_home_score: 0, p_away_score: 2,
    p_kgu_unattributed_goals: 0, p_records_status: 'complete', p_records_note: null,
  }
  const pid = (name) => Number(sql(`select id from public.players where name = '${name}' order by id limit 1`))

  // 득점 합이 맞지 않으면 거부, 아무것도 안 바뀜
  const rev0 = revision()
  const wrong = await call('admin', 'POST', '/rpc/save_match_result', {
    ...base, p_request_id: randomUUID(), p_players: [{ player_id: pid('김기완'), shirt_number: 22, goals: 1 }],
  })
  assert.ok(wrong.status >= 400 && /득점/.test(JSON.stringify(wrong.json)), JSON.stringify(wrong.json))
  assert.equal(Number(sql(`select count(*) from public.player_records where match_id = ${m.id}`)), 0)
  assert.equal(revision(), rev0)
  ok('저장 함수: 선수 득점 합 ≠ 점수면 거부, 변경 없음')

  // 중간에 잘못된 줄(경고 5)이 있으면 전체 취소
  const mid = await call('admin', 'POST', '/rpc/save_match_result', {
    ...base, p_request_id: randomUUID(),
    p_players: [{ player_id: pid('김기완'), shirt_number: 22, goals: 2 }, { name: '새선수', shirt_number: 30, yellow: 5 }],
  })
  assert.ok(mid.status >= 400)
  assert.equal(Number(sql(`select count(*) from public.player_records where match_id = ${m.id}`)), 0)
  assert.equal(Number(sql(`select count(*) from public.players where name = '새선수'`)), 0, '새 선수도 만들어지면 안 됨')
  assert.equal(sql(`select records_status from public.matches where id = ${m.id}`), 'pending')
  ok('저장 함수: 중간 오류 시 경기·선수·새 선수 모두 취소(전체 롤백)')

  // 정상 저장 + 같은 요청 다시 보내기
  const req = randomUUID()
  const good = { ...base, p_request_id: req, p_players: [{ player_id: pid('김기완'), shirt_number: 22, goals: 1 }, { name: '새선수', shirt_number: 30, goals: 1 }] }
  const r1 = await call('admin', 'POST', '/rpc/save_match_result', good)
  assert.equal(r1.status, 200, JSON.stringify(r1.json))
  assert.equal(r1.json.duplicate, false)
  assert.equal(Number(sql(`select count(*) from public.player_records where match_id = ${m.id}`)), 2)
  const r2 = await call('admin', 'POST', '/rpc/save_match_result', good)
  assert.equal(r2.json.duplicate, true)
  assert.equal(Number(sql(`select count(*) from public.player_records where match_id = ${m.id}`)), 2)
  ok('저장 함수: 정상 저장, 같은 요청 두 번은 한 번만 처리')

  // 예전 버전으로 저장하면 충돌
  const st = await call('admin', 'POST', '/rpc/save_match_result', { ...good, p_request_id: randomUUID() })
  assert.ok(st.status >= 400 && /먼저 고쳤/.test(JSON.stringify(st.json)), JSON.stringify(st.json))
  ok('저장 함수: 예전 버전으로 저장하면 충돌 안내')

  // 감사 기록은 같은 처리 안에서 남음, 수정자는 운영진
  assert.ok(Number(sql(`select count(*) from private.audit_log where table_name = 'player_records' and actor_id = '${ADMIN}'`)) >= 2)
  assert.equal(sql(`select updated_by from public.matches where id = ${m.id}`), ADMIN)
  ok('감사 기록: 선수 줄·경기 수정이 운영진 이름으로 남음')

  // 종료가 아닌데 점수가 있으면 DB 제약이 막음
  const m2 = JSON.parse(sql(`select row_to_json(m) from public.matches m where match_date = '2026-10-30'`))
  const sched = await call('admin', 'POST', '/rpc/save_match_result', {
    p_match_id: m2.id, p_expected_version: m2.version, p_request_id: randomUUID(), p_status: 'scheduled', p_home_score: 1,
    p_away_score: 0, p_kgu_unattributed_goals: 0, p_records_status: 'pending', p_records_note: null, p_players: null,
  })
  assert.ok(sched.status >= 400)
  ok('경기 상태: 예정 경기에 점수 넣기 거부')
}

// ---------- 0002: 점수·선수 기록·순위표는 저장 함수로만 ----------
{
  const m = JSON.parse(sql(`select row_to_json(m) from public.matches m where match_date = '2026-09-18'`))
  denied(await call('admin', 'PATCH', `/matches?id=eq.${m.id}`, { home_score: 9 }), '운영진 점수 직접 수정')
  denied(await call('admin', 'PATCH', `/matches?id=eq.${m.id}`, { venue: '직접' }), '운영진 장소 직접 수정')
  denied(await call('admin', 'DELETE', `/player_records?match_id=eq.${m.id}`), '운영진 선수 기록 직접 삭제')
  denied(await call('admin', 'POST', '/player_records', { match_id: m.id, player_id: 1, goals: 5 }), '운영진 선수 기록 직접 추가')
  denied(await call('admin', 'PATCH', '/standings?rank=eq.1', { points: 99 }), '운영진 순위표 직접 수정')
  assert.equal(sql(`select home_score from public.matches where id = ${m.id}`), '3')
  const arch = await call('admin', 'PATCH', `/matches?id=eq.${m.id}&version=eq.${m.version}`, { archived_at: new Date().toISOString() })
  assert.equal(arch.status, 200, JSON.stringify(arch.json))
  assert.equal(arch.json.length, 1)
  sql(`update public.matches set archived_at = null where id = ${m.id}`)
  ok('0002: 점수·장소·선수 기록·순위표 직접 쓰기 막힘, 보관만 직접 가능')
}
{
  // save_match: 9/18 경기대 3:2 칼빈대 (선수 기록 완료) — 장소는 고쳐지고, 득점 합과 다른 점수는 거부
  const m = JSON.parse(sql(`select row_to_json(m) from public.matches m where match_date = '2026-09-18'`))
  const args = (o) => ({ p_match_id: m.id, p_request_id: randomUUID(), p_match_date: '2026-09-18', p_kickoff: '15:00', p_venue: '경기대 대운동장', p_status: 'finished', p_home_score: 3, p_away_score: 2, ...o })
  const ok1 = await call('admin', 'POST', '/rpc/save_match', args({ p_expected_version: m.version, p_venue: '경기대 대운동장 (시험)' }))
  assert.equal(ok1.status, 200, JSON.stringify(ok1.json))
  const v = Number(sql(`select version from public.matches where id = ${m.id}`))
  const badScore = await call('admin', 'POST', '/rpc/save_match', args({ p_expected_version: v, p_home_score: 4 }))
  assert.ok(badScore.status >= 400 && /득점/.test(JSON.stringify(badScore.json)), JSON.stringify(badScore.json))
  assert.equal(sql(`select home_score from public.matches where id = ${m.id}`), '3')
  const toSched = await call('admin', 'POST', '/rpc/save_match', args({ p_expected_version: v, p_status: 'postponed' }))
  assert.ok(toSched.status >= 400)
  const stale = await call('admin', 'POST', '/rpc/save_match', args({ p_expected_version: m.version }))
  assert.ok(stale.status >= 400 && /먼저 고쳤/.test(JSON.stringify(stale.json)))
  ok('save_match: 일정 수정, 선수 기록과 어긋난 점수·상태 거부, 버전 충돌')

  // save_match_result 로 점수와 선수 기록을 함께 정정 (3:2 → 4:2, 득점 한 골 추가)
  const recs = JSON.parse(sql(`select json_agg(json_build_object('player_id', player_id, 'shirt_number', shirt_number, 'goals', goals, 'assists', assists, 'yellow', yellow, 'red', red) order by id) from public.player_records where match_id = ${m.id}`))
  recs[0].goals += 1
  const fix = await call('admin', 'POST', '/rpc/save_match_result', {
    p_match_id: m.id, p_expected_version: v, p_request_id: randomUUID(), p_status: 'finished', p_home_score: 4, p_away_score: 2,
    p_kgu_unattributed_goals: 0, p_records_status: 'complete', p_records_note: null, p_players: recs,
  })
  assert.equal(fix.status, 200, JSON.stringify(fix.json))
  assert.equal(sql(`select home_score from public.matches where id = ${m.id}`), '4')
  ok('save_match_result: 점수와 선수 기록을 한 번에 정정')
}
{
  // replace_standings
  const key = () => sql(`select coalesce(string_agg(team_id || ':' || version, ',' order by team_id), '') from public.standings`)
  const rows = JSON.parse(sql(`select json_agg(json_build_object('team_id', team_id, 'rank', rank, 'played', played, 'won', won, 'drawn', drawn, 'lost', lost, 'goals_for', goals_for, 'goals_against', goals_against, 'points', points, 'yellow', yellow, 'red', red) order by rank) from public.standings`))
  const comp = sql(`select competition from public.standings limit 1`)
  const call2 = (o) => call('admin', 'POST', '/rpc/replace_standings', { p_season: 2026, p_competition: comp, p_group_label: '', p_expected: key(), p_request_id: randomUUID(), p_rows: rows, ...o })
  const before = key()
  // 위에서 9/18 을 4:2 로 바꿨으므로 지금 순위표(30득점)와 경기 결과(31득점)가 다름 → 거부, 변경 없음
  const mismatch = await call2({})
  assert.ok(mismatch.status >= 400 && /경기대 줄/.test(JSON.stringify(mismatch.json)), JSON.stringify(mismatch.json))
  assert.equal(key(), before)
  const ours = rows.find((r) => r.team_id === Number(sql(`select id from public.teams where is_ours`)))
  ours.goals_for += 1
  const yeoju = rows.find((r) => r.team_id === Number(sql(`select id from public.teams where short_name = '여주대'`)))
  yeoju.points -= 3
  const stale = await call2({ p_expected: '1:1' })
  assert.ok(stale.status >= 400 && /먼저/.test(JSON.stringify(stale.json)))
  const req = randomUUID()
  const good = await call2({ p_request_id: req })
  assert.equal(good.status, 200, JSON.stringify(good.json))
  assert.equal(sql(`select points_adjustment from public.standings where team_id = ${yeoju.team_id}`), '-3')
  const dup = await call2({ p_request_id: req, p_expected: 'x' })
  assert.equal(dup.json.duplicate, true)
  ok('replace_standings: 경기 결과와 어긋나면 거부, 버전 충돌, 승점 조정 계산, 같은 요청 한 번')
}
{
  // reorder_posts
  const list = JSON.parse(sql(`select json_agg(json_build_object('id', id, 'version', version) order by id) from public.posts where kind = 'magazine' and archived_at is null`))
  const positions = () => sql(`select string_agg(id || ':' || position, ',' order by id) from public.posts where kind = 'magazine'`)
  const before = positions()
  const ids = list.map((p) => p.id).reverse()
  const vers = list.map((p) => p.version).reverse()
  const stale = await call('admin', 'POST', '/rpc/reorder_posts', { p_request_id: randomUUID(), p_ids: ids, p_versions: vers.map((x, i) => (i === 0 ? x + 5 : x)) })
  assert.ok(stale.status >= 400)
  assert.equal(positions(), before, '하나라도 버전이 다르면 아무 글도 순서가 바뀌면 안 됨')
  const good = await call('admin', 'POST', '/rpc/reorder_posts', { p_request_id: randomUUID(), p_ids: ids, p_versions: vers })
  assert.equal(good.status, 200, JSON.stringify(good.json))
  assert.equal(Number(sql(`select position from public.posts where id = ${ids[0]}`)), 0)
  assert.equal(Number(sql(`select position from public.posts where id = ${ids[ids.length - 1]}`)), ids.length - 1)
  ok('reorder_posts: 버전이 하나라도 다르면 전체 거부, 맞으면 한 번에 순서 저장')
}

// ---------- 반영 요청: 60초 안 중복은 한 번만 ----------
{
  const a = await call('admin', 'POST', '/rpc/request_publish', {})
  const b = await call('admin', 'POST', '/rpc/request_publish', {})
  assert.equal(a.json.dispatch, true)
  assert.equal(b.json.dispatch, false)
  ok('반영 요청: 연속으로 눌러도 배포 요청은 한 번')
}

// ---------- 스스로 운영진 되기·권한 회수 ----------
{
  const self = await call('other', 'POST', '/admins', { user_id: OTHER, display_name: '나' })
  assert.ok(self.status === 404 || self.status === 401 || self.status === 403)
  ok('권한 상승: 운영진 명단에 스스로 추가 불가')

  sql(`delete from private.admins where user_id = '${ADMIN}'`)
  const after = await call('admin', 'POST', '/teams', { short_name: '회수후' })
  assert.equal(after.status, 403)
  ok('권한 회수: 운영진에서 빠진 뒤에는 바로 쓰기 막힘')
}

console.log(`권한·저장 시험 ${n}개 통과`)
