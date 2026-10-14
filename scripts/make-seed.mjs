/**
 * 지금 사이트 자료(src/data/*.json)를 Supabase 로 옮기는 SQL 만들기. 실행: npm run make:seed
 * 결과 supabase/seed.sql 을 마이그레이션 다음에 SQL Editor 에서 한 번 실행.
 * - 같은 줄이 이미 있으면 넘어감 → 두 번 돌려도 안전
 * - 네트워크·비밀 키를 쓰지 않음 (대시보드에서 소유자 권한으로 실행)
 * - 장애 복구 때도 같은 방법: 저장소의 최신 JSON → seed.sql → 새 DB (운영진·수정 기록은 복구되지 않음)
 */
import { readFileSync, writeFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'))
const season = read('../src/data/matches.json')
const records = read('../src/data/records.json')
const posts = read('../src/data/posts.json')
const OURS = '경기대'
const YEAR = Number(season.matches[0]?.date.slice(0, 4) ?? 2026)

const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const team = (name) => `(select id from public.teams where short_name = ${q(name)})`
const match = (m) =>
  `(select id from public.matches where season = ${YEAR} and competition = ${q(season.competition)} and match_date = ${q(m.date)} and home_team_id = ${team(m.home)} and away_team_id = ${team(m.away)})`

const out = ['-- 자동 생성: scripts/make-seed.mjs (직접 고치지 말 것)', 'begin;', '']

// 학교
const teams = [...new Set([...season.matches.flatMap((m) => [m.home, m.away]), ...records.standings.map((s) => s.team)])]
out.push('-- 학교')
for (const t of teams) {
  out.push(`insert into public.teams (short_name, is_ours) values (${q(t)}, ${t === OURS}) on conflict (short_name) do nothing;`)
}

// 선수 (지금 자료에는 동명이인이 없어 이름으로 하나씩 만듦. 이후 동명이인은 관리자 화면에서 ID 로 구분)
const names = [...new Set(records.matches.flatMap((r) => r.players.map((p) => p.name)))]
out.push('', '-- 선수')
for (const n of names) {
  out.push(`insert into public.players (name) select ${q(n)} where not exists (select 1 from public.players where name = ${q(n)});`)
}

// 경기
out.push('', '-- 경기')
for (const m of season.matches) {
  const lineup = records.matches.find((r) => r.date === m.date)
  const missing = (records.unavailable ?? []).find((r) => r.date === m.date)
  const finished = m.homeScore !== null && m.awayScore !== null
  const status = m.status ?? (finished ? 'finished' : 'scheduled')
  const recordsStatus = lineup ? 'complete' : missing ? 'unavailable' : 'pending'
  const note = lineup?.note ?? missing?.note ?? null
  out.push(
    `insert into public.matches (season, competition, match_date, kickoff, venue, home_team_id, away_team_id, status, home_score, away_score, kgu_unattributed_goals, records_status, records_note) values (${YEAR}, ${q(season.competition)}, ${q(m.date)}, ${q(m.time)}, ${q(m.venue)}, ${team(m.home)}, ${team(m.away)}, ${q(status)}, ${q(m.homeScore)}, ${q(m.awayScore)}, ${lineup?.unattributedGoals ?? 0}, ${q(recordsStatus)}, ${q(note)}) on conflict on constraint one_fixture do nothing;`,
  )
}

// 선수 기록
out.push('', '-- 경기별 경기대 선수 기록')
for (const r of records.matches) {
  const m = season.matches.find((x) => x.date === r.date)
  if (!m) throw new Error(`${r.date} 선수 기록에 맞는 경기가 matches.json 에 없음`)
  for (const p of r.players) {
    out.push(
      `insert into public.player_records (match_id, player_id, shirt_number, goals, assists, yellow, red) values (${match(m)}, (select id from public.players where name = ${q(p.name)} order by id limit 1), ${q(p.number)}, ${p.goals}, ${p.assists}, ${p.yellow}, ${p.red}) on conflict on constraint one_line_per_player do nothing;`,
    )
  }
}

// 순위표
out.push('', '-- 4권역 순위표')
for (const s of records.standings) {
  out.push(
    `insert into public.standings (season, competition, team_id, rank, played, won, drawn, lost, goals_for, goals_against, points, points_adjustment, yellow, red, source, checked_on) values (${YEAR}, ${q(records.competition)}, ${team(s.team)}, ${s.rank}, ${s.played}, ${s.won}, ${s.drawn}, ${s.lost}, ${s.goalsFor}, ${s.goalsAgainst}, ${s.points}, ${s.pointsAdjustment ?? 0}, ${s.yellow}, ${s.red}, ${q(records.source.label)}, ${q(records.updatedAt)}) on conflict do nothing;`,
  )
}

// 글
out.push('', '-- 블로그·매거진 글')
for (const [kind, list] of [['blog', posts.blog], ['magazine', posts.magazine]]) {
  list.forEach((p, i) => {
    out.push(
      `insert into public.posts (kind, title, summary, category, source, published_on, url, position) values (${q(kind)}, ${q(p.title)}, ${q(p.summary)}, ${q(p.category)}, ${q(p.source)}, ${q(p.date)}, ${q(p.href)}, ${i}) on conflict (url) do nothing;`,
    )
  })
}

out.push('', 'commit;', '')
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n'))
console.log(
  `seed.sql: 학교 ${teams.length}, 선수 ${names.length}, 경기 ${season.matches.length}, 선수 기록 ${records.matches.reduce((n, r) => n + r.players.length, 0)}, 순위표 ${records.standings.length}, 글 ${posts.blog.length + posts.magazine.length}`,
)
