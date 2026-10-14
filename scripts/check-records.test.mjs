/**
 * 시즌 기록 확인(check-records.mjs)의 데이터 계약 시험. 실행: npm run test:records
 * 지금 자료를 복사한 임시 폴더에서 상황을 하나씩 만들고, 허용할 것은 통과·막을 것은 실패하는지 본다
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src/data', import.meta.url))
const CHECK = fileURLToPath(new URL('./check-records.mjs', import.meta.url))
const base = {
  matches: JSON.parse(readFileSync(join(SRC, 'matches.json'), 'utf8')),
  records: JSON.parse(readFileSync(join(SRC, 'records.json'), 'utf8')),
}

function run(name, change, expect) {
  const dir = mkdtempSync(join(tmpdir(), 'kgu-check-'))
  const d = structuredClone(base)
  change(d)
  writeFileSync(join(dir, 'matches.json'), JSON.stringify(d.matches))
  writeFileSync(join(dir, 'records.json'), JSON.stringify(d.records))
  const r = spawnSync(process.execPath, [CHECK], { env: { ...process.env, DATA_DIR: dir }, encoding: 'utf8' })
  rmSync(dir, { recursive: true, force: true })
  const out = r.stdout + r.stderr
  if (expect.ok) assert.equal(r.status, 0, `${name}: 통과해야 하는데 실패\n${out}`)
  else assert.notEqual(r.status, 0, `${name}: 막아야 하는데 통과\n${out}`)
  if (expect.says) assert.match(out, expect.says, `${name}: 안내 문구`)
  console.log(`  ✓ ${expect.ok ? '허용' : '차단'}: ${name}`)
}

const ours = (d) => d.records.standings.find((s) => s.team === '경기대')
const lineup = (d, date) => d.records.matches.find((m) => m.date === date)
const drop = (d, date) => (d.records.matches = d.records.matches.filter((m) => m.date !== date))
// 10/9 경기를 순위표에서 빼기 (8경기 7승1무, 득실 28:12, 경고 19 — KUSF 10/8 표)
const standingsBefore109 = (d) => Object.assign(ours(d), { played: 8, won: 7, drawn: 1, lost: 0, goalsFor: 28, goalsAgainst: 12, goalDiff: 16, points: 22, yellow: 19 })

// ---- 허용
run('지금 자료', () => {}, { ok: true })
run('점수만 먼저 들어옴 (마지막 경기 선수 기록·순위표 대기)', (d) => (drop(d, '2026-10-09'), standingsBefore109(d)), { ok: true, says: /순위표 대기: 10\/9.*\n?.*선수 기록 대기: 10\/9/s })
run('중간 경기 선수 기록 대기 (경고 대조는 건너뜀)', (d) => drop(d, '2026-05-15'), { ok: true, says: /경고·퇴장 대조 건너뜀: 5\/15/ })
run('중간 경기 기록 없음 + 사유', (d) => (drop(d, '2026-05-15'), (d.records.unavailable = [{ date: '2026-05-15', note: 'KUSF 기록 미제공' }])), { ok: true, says: /선수 기록 없음: 5\/15/ })
run('순위표만 먼저 갱신 (선수 기록보다 앞섬)', (d) => drop(d, '2026-10-09'), { ok: true, says: /선수 기록 대기: 10\/9/ })
run('공식 승점 조정 (감점 -3)', (d) => {
  const s = d.records.standings.find((x) => x.team === '여주대')
  s.points -= 3
  s.pointsAdjustment = -3
}, { ok: true, says: /승점 조정: 여주대 -3/ })

// ---- 차단
run('완료 경기 득점 합이 점수와 다름', (d) => (lineup(d, '2026-10-09').players[0].goals += 1), { ok: false, says: /선수 득점 합/ })
run('조정 없이 승점이 맞지 않음', (d) => (d.records.standings.find((x) => x.team === '여주대').points -= 3), { ok: false, says: /여주대 승점/ })
run('순위표가 점수보다 앞섬 (점수 입력 누락)', (d) => {
  const m = d.matches.matches.find((x) => x.date === '2026-10-09')
  m.homeScore = m.awayScore = null
  drop(d, '2026-10-09')
}, { ok: false, says: /점수 입력이 빠졌는지/ })
run('순위표 경기대 줄과 경기 결과가 다름', (d) => (ours(d).goalsFor += 1, ours(d).goalDiff += 1), { ok: false, says: /경기대 줄과 앞 9경기/ })
run('경고 합이 다름 (선수 기록이 모두 있을 때)', (d) => (ours(d).yellow += 1), { ok: false, says: /경고·퇴장/ })
run('선수 기록이 취소된 경기를 가리킴', (d) => (d.matches.matches.find((x) => x.date === '2026-10-09').status = 'cancelled'), { ok: false })
run('기록 없음 사유가 비어 있음', (d) => (drop(d, '2026-05-15'), (d.records.unavailable = [{ date: '2026-05-15', note: '' }])), { ok: false, says: /사유/ })
run('같은 경기에 선수 기록과 기록 없음이 함께 있음', (d) => (d.records.unavailable = [{ date: '2026-05-15', note: '중복' }]), { ok: false, says: /함께 있음/ })
run('같은 학교가 순위표에 두 번', (d) => d.records.standings.push({ ...d.records.standings[7], rank: 8 }), { ok: false, says: /두 번/ })
console.log('시즌 기록 확인 계약 시험 통과')
