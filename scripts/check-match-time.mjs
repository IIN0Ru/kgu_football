/**
 * 경기 날짜·시간 계산 회귀 확인 (src/lib/match-time.ts)
 * 실행: npm run check:time  — 방문자 시간대가 달라도 같은 결과인지 TZ 를 바꿔 두 번 실행해 볼 것
 *   TZ=Asia/Seoul npm run check:time
 *   TZ=America/Los_Angeles npm run check:time
 */
import assert from 'node:assert/strict'
import { dDay, formatMatchWhen, isStillUpcoming, seoulDate } from '../src/lib/match-time.ts'

const at = (iso) => new Date(iso)
const cases = []
const check = (name, fn) => {
  fn()
  cases.push(name)
}

// 2. D-day 는 한국 날짜 기준 — 리뷰 예시: 한국 2026-10-08 23:30 에 10-09 11:00 경기는 D-1
check('한국 10-08 23:30 → 10-09 경기 D-1', () => {
  const now = at('2026-10-08T23:30:00+09:00') // = LA 10-08 07:30
  assert.equal(seoulDate(now), '2026-10-08')
  assert.deepEqual(dDay('2026-10-09', now), { label: 'D-1', today: false })
})
check('한국 10-09 00:10 (LA 는 아직 10-08) → 오늘 경기', () => {
  assert.deepEqual(dDay('2026-10-09', at('2026-10-09T00:10:00+09:00')), { label: '오늘 경기', today: true })
})
check('지난 날짜 → null', () => {
  assert.equal(dDay('2026-10-09', at('2026-10-10T00:00:00+09:00')), null)
})

// 1. 시각 확정 경기: 시작 후 2시간까지 유지
check('시각 확정: 시작 1시간 59분 뒤 유지, 2시간 1분 뒤 제외', () => {
  assert.equal(isStillUpcoming('2026-10-09', '11:00', at('2026-10-09T12:59:00+09:00')), true)
  assert.equal(isStillUpcoming('2026-10-09', '11:00', at('2026-10-09T13:01:00+09:00')), false)
})
// 1. 시각 미정 경기: 한국 기준 당일 끝까지 유지 (예전엔 자정+2시간 = 새벽 2시에 사라졌음)
check('시각 미정: 당일 02:30·23:59 유지, 다음 날 00:00 제외', () => {
  assert.equal(isStillUpcoming('2026-10-09', null, at('2026-10-09T02:30:00+09:00')), true)
  assert.equal(isStillUpcoming('2026-10-09', null, at('2026-10-09T23:59:00+09:00')), true)
  assert.equal(isStillUpcoming('2026-10-09', null, at('2026-10-10T00:00:00+09:00')), false)
})
check('시각 미정: 전날은 유지', () => {
  assert.equal(isStillUpcoming('2026-10-09', null, at('2026-10-08T22:00:00+09:00')), true)
})

// 화면 표시도 한국 시간
check('일시 표시: 시각 확정 / 미정', () => {
  const withTime = formatMatchWhen('2026-10-09', '11:00')
  assert.match(withTime, /10월 9일/)
  assert.match(withTime, /11:00/)
  assert.equal(formatMatchWhen('2026-10-09', null), `${formatMatchWhen('2026-10-09', null).split(' · ')[0]} · 시간 확인 중`)
  assert.match(formatMatchWhen('2026-10-09', null), /^10월 9일 \(금\) · 시간 확인 중$/)
})

console.log(`TZ=${process.env.TZ ?? '(기본)'} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}: ${cases.length}개 통과`)
for (const c of cases) console.log(`  ✓ ${c}`)
console.log(`  예: ${formatMatchWhen('2026-10-09', '11:00')} / ${formatMatchWhen('2026-10-09', null)}`)
