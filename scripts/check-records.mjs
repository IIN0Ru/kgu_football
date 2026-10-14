/**
 * 시즌 기록 자료 확인 (src/data/records.json ↔ matches.json). 실행: npm run check:records
 * 관리자 화면 '사이트에 반영' 때도 publish.yml 이 먼저 돌려서, 실패하면 사이트를 바꾸지 않는다.
 *
 * 데이터 계약 (2026-10-14, GPT 리뷰 1-1 반영) — "늦게 들어오는 것"은 허용하고 "서로 어긋난 것"은 막는다
 *  허용(통과, 안내만):
 *   - 점수만 먼저 들어온 경기 (선수 기록 '대기'). 마지막 경기가 아니어도 됨
 *   - 선수 기록이 끝내 없는 경기 ('기록 없음' + 사유, records.unavailable)
 *   - 순위표가 점수보다 늦음 (순위표 경기 수 N < 끝난 경기 수)
 *   - 공식 승점 조정 (pointsAdjustment: 승점 = 승×3 + 무 + 조정)
 *  차단(실패):
 *   - 선수 기록이 '완료'인 경기의 선수 득점 합 + 기록에 없는 득점 ≠ 경기대 점수
 *   - 선수 기록·기록 없음이 끝나지 않은(점수 없는·연기·취소) 경기를 가리킴, 같은 경기에 둘 다 있음
 *   - 순위표 한 줄 안에서 어긋남: 경기 ≠ 승+무+패, 득실 ≠ 득점−실점, 승점 ≠ 승×3+무+조정, 순위 순서, 같은 학교 두 줄
 *   - 순위표가 점수보다 앞섬 (N > 끝난 경기 수 → 점수 입력이 빠졌다는 뜻)
 *   - 순위표 경기대 줄의 승무패·득실점 ≠ 끝난 경기를 날짜순으로 앞에서부터 N경기 합
 *   - 경고·퇴장: 앞 N경기의 선수 기록이 모두 '완료'일 때만 순위표와 비교 (하나라도 대기·없음이면 비교를 건너뛰고 안내)
 * 시험: npm run test:records (scripts/check-records.test.mjs). 다른 폴더의 자료를 검사하려면 DATA_DIR=폴더
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = process.env.DATA_DIR ?? fileURLToPath(new URL('../src/data', import.meta.url))
const read = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'))
const season = read('matches.json')
const records = read('records.json')
const OUR = '경기대'
const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`

// 끝난 경기 = 점수가 있고 연기·취소가 아닌 경기 (날짜순)
const finished = season.matches
  .filter((m) => !m.status && m.homeScore !== null && m.awayScore !== null)
  .sort((a, b) => a.date.localeCompare(b.date))
const finishedByDate = new Map(finished.map((m) => [m.date, m]))
const lineups = new Map(records.matches.map((m) => [m.date, m]))
const missing = new Map((records.unavailable ?? []).map((m) => [m.date, m]))
assert.equal(lineups.size, records.matches.length, '선수 기록 날짜가 겹침')
assert.equal(missing.size, (records.unavailable ?? []).length, '기록 없음 날짜가 겹침')
const kgu = (m) => {
  const home = m.home === OUR
  return { f: home ? m.homeScore : m.awayScore, a: home ? m.awayScore : m.homeScore }
}

// 1) 선수 기록 ↔ 점수
for (const [date, l] of lineups) {
  const m = finishedByDate.get(date)
  assert.ok(m, `${md(date)} 선수 기록에 맞는 끝난 경기 없음 (점수 없음·연기·취소)`)
  assert.ok(!missing.has(date), `${md(date)} 선수 기록과 '기록 없음'이 함께 있음`)
  const goals = l.players.reduce((n, p) => n + p.goals, 0) + (l.unattributedGoals ?? 0)
  assert.equal(goals, kgu(m).f, `${md(date)} 선수 득점 합(${goals}) ≠ 경기대 득점(${kgu(m).f})`)
  for (const p of l.players) {
    assert.ok(p.name && Number.isInteger(p.number), `${md(date)} 선수 이름·번호 확인`)
    for (const k of ['goals', 'assists', 'yellow', 'red']) assert.ok(Number.isInteger(p[k]) && p[k] >= 0, `${md(date)} ${p.name} ${k}`)
  }
}
for (const [date, x] of missing) {
  assert.ok(finishedByDate.has(date), `${md(date)} '기록 없음'에 맞는 끝난 경기 없음`)
  assert.ok(x.note && x.note.trim(), `${md(date)} '기록 없음' 사유가 비어 있음`)
}

// 2) 순위표 한 줄 안의 일관성
const teams = new Set()
records.standings.forEach((s, i) => {
  assert.ok(!teams.has(s.team), `${s.team} 순위표에 두 번 나옴`)
  teams.add(s.team)
  const adj = s.pointsAdjustment ?? 0
  assert.equal(s.rank >= 1 && s.rank <= i + 1, true, `${s.team} 순위`)
  assert.equal(s.played, s.won + s.drawn + s.lost, `${s.team} 경기 수 ≠ 승+무+패`)
  assert.equal(s.goalDiff, s.goalsFor - s.goalsAgainst, `${s.team} 득실`)
  assert.equal(s.points, s.won * 3 + s.drawn + adj, `${s.team} 승점(${s.points}) ≠ 승×3+무${adj ? `+조정(${adj})` : ''}`)
})

// 3) 순위표 경기대 줄 ↔ 앞에서부터 N경기
const ours = records.standings.find((s) => s.team === OUR)
assert.ok(ours, '순위표에 경기대 없음')
const N = ours.played
assert.ok(N <= finished.length, `순위표는 ${N}경기인데 점수가 들어온 경기는 ${finished.length}경기 — 점수 입력이 빠졌는지 확인`)
const firstN = finished.slice(0, N)
let won = 0, drawn = 0, lost = 0, gf = 0, ga = 0
for (const m of firstN) {
  const { f, a } = kgu(m)
  gf += f
  ga += a
  if (f > a) won++
  else if (f === a) drawn++
  else lost++
}
assert.deepEqual(
  { won: ours.won, drawn: ours.drawn, lost: ours.lost, goalsFor: ours.goalsFor, goalsAgainst: ours.goalsAgainst },
  { won, drawn, lost, goalsFor: gf, goalsAgainst: ga },
  `순위표 경기대 줄과 앞 ${N}경기 결과가 다름`,
)

// 4) 경고·퇴장: 앞 N경기 선수 기록이 모두 있을 때만
const notes = []
const incomplete = firstN.filter((m) => !lineups.has(m.date))
if (incomplete.length === 0) {
  let yellow = 0, red = 0
  for (const m of firstN) for (const p of lineups.get(m.date).players) (yellow += p.yellow), (red += p.red)
  assert.deepEqual({ yellow: ours.yellow, red: ours.red }, { yellow, red }, `순위표 경기대 경고·퇴장과 앞 ${N}경기 선수 기록 합이 다름`)
} else {
  notes.push(`경고·퇴장 대조 건너뜀: ${incomplete.map((m) => md(m.date)).join(', ')} 선수 기록 ${incomplete.some((m) => missing.has(m.date)) ? '없음·대기' : '대기'}`)
}

const waiting = finished.filter((m) => !lineups.has(m.date) && !missing.has(m.date))
if (finished.length > N) notes.push(`순위표 대기: ${finished.slice(N).map((m) => md(m.date)).join(', ')} (순위표는 ${N}경기까지)`)
if (waiting.length) notes.push(`선수 기록 대기: ${waiting.map((m) => md(m.date)).join(', ')}`)
if (missing.size) notes.push(`선수 기록 없음: ${[...missing.keys()].map(md).join(', ')}`)
const adjusted = records.standings.filter((s) => s.pointsAdjustment)
if (adjusted.length) notes.push(`승점 조정: ${adjusted.map((s) => `${s.team} ${s.pointsAdjustment}`).join(', ')}`)
for (const n of notes) console.log(n)
console.log(`시즌 기록 확인 통과: 순위표 ${N}경기(${won}승 ${drawn}무 ${lost}패, ${gf}득점 ${ga}실점) · 점수 ${finished.length}경기 · 선수 기록 ${lineups.size}경기`)
