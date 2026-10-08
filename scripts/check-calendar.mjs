/**
 * 캘린더 만들기 회귀 확인 (src/lib/calendar.ts). 실행: npm run check:calendar
 * TZ 를 바꿔 실행해도 같은 결과여야 함 (한국 시간 기준)
 */
import assert from 'node:assert/strict'
import { buildIcs, googleCalendarUrl } from '../src/lib/calendar.ts'

const timed = { date: '2026-10-09', time: '11:00', home: '홍익대', away: '경기대', venue: '화성비봉습지공원축구장', competition: 'U리그 4권역' }
const tbd = { ...timed, time: null, venue: 'A; B, C' }
const stamp = new Date('2026-10-08T00:00:00Z')

// 한국 11:00 = UTC 02:00, 2시간
const g = new URL(googleCalendarUrl(timed))
assert.equal(g.searchParams.get('dates'), '20261009T020000Z/20261009T040000Z')
assert.equal(g.searchParams.get('ctz'), 'Asia/Seoul')
assert.equal(g.searchParams.get('location'), '화성비봉습지공원축구장')
// 시각 미정 → 하루 종일
assert.equal(new URL(googleCalendarUrl(tbd)).searchParams.get('dates'), '20261009/20261010')

const ics = buildIcs([timed, tbd], stamp)
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'))
assert.equal(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT').length, 2)
assert.ok(ics.includes('DTSTART:20261009T020000Z\r\n') && ics.includes('DTEND:20261009T040000Z\r\n'))
assert.ok(ics.includes('DTSTART;VALUE=DATE:20261009\r\n') && ics.includes('DTEND;VALUE=DATE:20261010\r\n'))
assert.ok(ics.includes(String.raw`LOCATION:A\; B\, C` + '\r\n'), '세미콜론·쉼표 이스케이프')
assert.ok(ics.includes('DTSTAMP:20261008T000000Z\r\n'))
console.log(`TZ=${process.env.TZ ?? '(기본)'}: 캘린더 확인 통과`)
