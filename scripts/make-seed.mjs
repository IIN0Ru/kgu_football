/**
 * 지금 사이트 자료(src/data/*.json)를 Supabase 로 옮기는 SQL 만들기. 실행: npm run make:seed
 * 결과 supabase/seed.sql 을 Supabase SQL Editor 에 붙여넣고 Run (schema.sql 다음에, 한 번만)
 * - 같은 줄이 이미 있으면 덮어쓰지 않고 넘어감 (on conflict do nothing) → 실수로 두 번 돌려도 안전
 * - 비밀 키 없이 대시보드에서 실행하므로 이 스크립트는 네트워크를 쓰지 않음
 */
import { readFileSync, writeFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'))
const season = read('../src/data/matches.json')
const records = read('../src/data/records.json')
const posts = read('../src/data/posts.json')

const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const out = ['-- 자동 생성: scripts/make-seed.mjs (직접 고치지 말 것)', 'begin;', '']

out.push('-- 경기')
for (const m of season.matches) {
  const lineup = records.matches.find((r) => r.date === m.date)
  out.push(
    `insert into public.matches (season, competition, date, time, venue, home, away, home_score, away_score, unattributed_goals) values (2026, ${q(season.competition)}, ${q(m.date)}, ${q(m.time)}, ${q(m.venue)}, ${q(m.home)}, ${q(m.away)}, ${q(m.homeScore)}, ${q(m.awayScore)}, ${lineup?.unattributedGoals ?? 0}) on conflict (date, home, away) do nothing;`,
  )
}

out.push('', '-- 경기별 경기대 선수 기록')
for (const r of records.matches) {
  const m = season.matches.find((x) => x.date === r.date)
  if (!m) throw new Error(`${r.date} 선수 기록에 맞는 경기가 matches.json 에 없음`)
  for (const p of r.players) {
    out.push(
      `insert into public.player_records (match_id, number, name, goals, assists, yellow, red) select id, ${q(p.number)}, ${q(p.name)}, ${p.goals}, ${p.assists}, ${p.yellow}, ${p.red} from public.matches where date = ${q(m.date)} and home = ${q(m.home)} and away = ${q(m.away)} on conflict (match_id, name) do nothing;`,
    )
  }
}

out.push('', '-- 4권역 순위표')
for (const s of records.standings) {
  out.push(
    `insert into public.standings (season, team, rank, played, points, won, drawn, lost, goals_for, goals_against, yellow, red) values (2026, ${q(s.team)}, ${s.rank}, ${s.played}, ${s.points}, ${s.won}, ${s.drawn}, ${s.lost}, ${s.goalsFor}, ${s.goalsAgainst}, ${s.yellow}, ${s.red}) on conflict (season, team) do nothing;`,
  )
}

out.push('', '-- 블로그·매거진 글')
for (const [kind, list] of [['blog', posts.blog], ['magazine', posts.magazine]]) {
  list.forEach((p, i) => {
    out.push(
      `insert into public.posts (kind, title, summary, category, source, date, href, position) values (${q(kind)}, ${q(p.title)}, ${q(p.summary)}, ${q(p.category)}, ${q(p.source)}, ${q(p.date)}, ${q(p.href)}, ${i}) on conflict (href) do nothing;`,
    )
  })
}

out.push('', 'commit;', '')
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n'))
console.log(`seed.sql: 경기 ${season.matches.length}, 선수 기록 ${records.matches.reduce((n, r) => n + r.players.length, 0)}, 순위표 ${records.standings.length}, 글 ${posts.blog.length + posts.magazine.length}`)
