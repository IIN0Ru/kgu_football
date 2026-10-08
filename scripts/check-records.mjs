/**
 * 시즌 기록 자료 확인 (src/data/records.json ↔ matches.json). 실행: npm run check:records
 * 사람이 옮겨 넣는 자료라서, 옮긴 숫자끼리 서로 맞는지 확인한다.
 * - 끝난 경기마다 선수 기록이 있고, 선수 득점 합 + 기록에 없는 득점 = 경기대 득점
 * - 순위표의 경기대 줄(승무패·득실점·경고·퇴장) = 경기 결과·선수 기록에서 계산한 값
 * - 순위표 승점 = 승×3 + 무, 득실 = 득점 − 실점, 순위는 1부터 차례대로
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'))
const season = read('../src/data/matches.json')
const records = read('../src/data/records.json')
const OUR = '경기대'

const played = season.matches.filter((m) => m.homeScore !== null && m.awayScore !== null)
const lineups = new Map(records.matches.map((m) => [m.date, m]))
assert.equal(lineups.size, records.matches.length, '선수 기록 날짜가 겹침')

let won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, yellow = 0, red = 0
for (const m of played) {
  const home = m.home === OUR
  const f = home ? m.homeScore : m.awayScore
  const a = home ? m.awayScore : m.homeScore
  const l = lineups.get(m.date)
  assert.ok(l, `${m.date} 선수 기록 없음`)
  const goals = l.players.reduce((n, p) => n + p.goals, 0) + (l.unattributedGoals ?? 0)
  assert.equal(goals, f, `${m.date} 선수 득점 합(${goals}) ≠ 경기대 득점(${f})`)
  for (const p of l.players) {
    assert.ok(p.name && Number.isInteger(p.number), `${m.date} 선수 이름·번호 확인`)
    for (const k of ['goals', 'assists', 'yellow', 'red']) assert.ok(Number.isInteger(p[k]) && p[k] >= 0, `${m.date} ${p.name} ${k}`)
    yellow += p.yellow
    red += p.red
  }
  gf += f
  ga += a
  if (f > a) won++
  else if (f === a) drawn++
  else lost++
}
for (const date of lineups.keys()) assert.ok(played.some((m) => m.date === date), `${date} 선수 기록에 맞는 끝난 경기 없음`)

const ours = records.standings.find((s) => s.team === OUR)
assert.ok(ours, '순위표에 경기대 없음')
assert.deepEqual(
  { played: ours.played, won: ours.won, drawn: ours.drawn, lost: ours.lost, goalsFor: ours.goalsFor, goalsAgainst: ours.goalsAgainst, yellow: ours.yellow, red: ours.red },
  { played: played.length, won, drawn, lost, goalsFor: gf, goalsAgainst: ga, yellow, red },
  '순위표 경기대 줄과 경기 기록이 다름',
)
records.standings.forEach((s, i) => {
  assert.equal(s.rank >= 1 && s.rank <= i + 1, true, `${s.team} 순위`)
  assert.equal(s.points, s.won * 3 + s.drawn, `${s.team} 승점`)
  assert.equal(s.goalDiff, s.goalsFor - s.goalsAgainst, `${s.team} 득실`)
  assert.equal(s.played, s.won + s.drawn + s.lost, `${s.team} 경기 수`)
})

console.log(`시즌 기록 확인 통과: ${played.length}경기, ${won}승 ${drawn}무 ${lost}패, ${gf}득점 ${ga}실점, 경고 ${yellow}`)
