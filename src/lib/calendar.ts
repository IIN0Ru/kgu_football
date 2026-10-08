/**
 * 경기를 캘린더에 넣기 (2026-10-08 일정 페이지)
 * - 구글 캘린더 '일정 추가' 주소와 .ics 파일(애플·아웃룩·구글 모두 가져오기 가능)을 만듦
 * - 시각은 한국 시간 기준(match-time.ts). 시각 미정이면 하루 종일 일정으로
 * - 경기 시간은 정해진 길이가 없어 2시간으로 둠
 * - 순수 함수: 만든 시각(stamp)을 밖에서 넣어 시험 가능
 */
import { kickoffIso } from './match-time.ts'  // 상대 경로: node 회귀 시험(scripts/check-calendar.mjs)에서도 읽히게

export interface CalendarMatch {
  date: string
  time: string | null
  home: string
  away: string
  venue: string | null
  competition: string
}

const MATCH_MS = 2 * 3_600_000

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const dayStamp = (date: string) => date.replace(/-/g, '')
const nextDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function range(m: CalendarMatch): { start: string; end: string; allDay: boolean } {
  const iso = kickoffIso(m.date, m.time)
  if (!iso) return { start: dayStamp(m.date), end: dayStamp(nextDay(m.date)), allDay: true }
  const s = new Date(iso)
  return { start: utcStamp(s), end: utcStamp(new Date(s.getTime() + MATCH_MS)), allDay: false }
}

const title = (m: CalendarMatch) => `${m.home} vs ${m.away} · ${m.competition}`
const details = (m: CalendarMatch) =>
  `${m.competition}${m.time ? '' : ' (시작 시간 확인 중)'}\n경기대학교 축구부 비공식 팬 사이트 https://iin0ru.github.io/kgu_football/schedule`

/** 구글 캘린더 '일정 추가' 화면 주소 */
export function googleCalendarUrl(m: CalendarMatch): string {
  const { start, end } = range(m)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title(m),
    dates: `${start}/${end}`,
    details: details(m),
    ctz: 'Asia/Seoul',
  })
  if (m.venue) q.set('location', m.venue)
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** 여러 경기를 담은 .ics 내용 (줄바꿈 CRLF) */
export function buildIcs(matches: CalendarMatch[], stamp: Date): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//kgu_football//schedule//KO',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:경기대 축구부 일정 (비공식)',
    'X-WR-TIMEZONE:Asia/Seoul',
  ]
  for (const m of matches) {
    const { start, end, allDay } = range(m)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.date}-${encodeURIComponent(m.home)}-${encodeURIComponent(m.away)}@kgu_football`,
      `DTSTAMP:${utcStamp(stamp)}`,
      allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
      allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
      `SUMMARY:${esc(title(m))}`,
      `DESCRIPTION:${esc(details(m))}`,
      ...(m.venue ? [`LOCATION:${esc(m.venue)}`] : []),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
