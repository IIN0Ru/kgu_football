/**
 * 경기 날짜·시간 계산 (2026-10-07 GPT 리뷰 반영)
 * - 모든 판단은 한국 시간(Asia/Seoul) 기준. 방문자가 어느 나라에 있든 같은 결과가 나와야 함
 * - 날짜(date)와 시각(time)을 따로 다룸: 시각이 미정(null)이어도 날짜는 확정이므로
 *   자정으로 꾸며 계산하지 않음
 * - 화면 코드와 분리된 순수 함수라 now 를 넣어 시험할 수 있음 (scripts/check-match-time.mjs)
 */

export const MATCH_TZ = 'Asia/Seoul'
/** 시각이 확정된 경기는 시작 후 이만큼 지날 때까지 '다음 경기'로 남김 (경기 중에도 '오늘 경기'로 보이게) */
const KEEP_AFTER_KICKOFF_MS = 2 * 3_600_000

/** 'YYYY-MM-DD' + 'HH:MM' → 한국 시간 기준 시작 시각(ISO). 시각이 없으면 null */
export function kickoffIso(date: string, time: string | null): string | null {
  return time ? `${date}T${time}:00+09:00` : null
}

/** 주어진 순간의 한국 날짜 'YYYY-MM-DD' */
export function seoulDate(now: Date): string {
  // en-CA 형식은 YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MATCH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** 'YYYY-MM-DD' 두 개의 날짜 차이(일). 달력 날짜만 비교하므로 시간대·서머타임 영향 없음 */
function daysBetween(from: string, to: string): number {
  const utc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))
  return Math.round((utc(to) - utc(from)) / 86_400_000)
}

/**
 * 아직 '다음 경기'로 보여줄 경기인지
 * - 시각 확정: 시작 후 2시간까지
 * - 시각 미정: 한국 기준 경기 당일이 끝날 때까지
 */
export function isStillUpcoming(date: string, time: string | null, now: Date): boolean {
  const iso = kickoffIso(date, time)
  if (iso) return new Date(iso).getTime() > now.getTime() - KEEP_AFTER_KICKOFF_MS
  return daysBetween(seoulDate(now), date) >= 0
}

/** 상태 알약: 한국 날짜 기준 D-day. 지난 경기는 null */
export function dDay(date: string, now: Date): { label: string; today: boolean } | null {
  const diff = daysBetween(seoulDate(now), date)
  if (diff < 0) return null
  if (diff === 0) return { label: '오늘 경기', today: true }
  return { label: `D-${diff}`, today: false }
}

/** 일시 표시 (한국 시간). 시각 미정이면 날짜 + '시간 확인 중' */
export function formatMatchWhen(date: string, time: string | null): string {
  const iso = kickoffIso(date, time)
  const base = { month: 'long', day: 'numeric', weekday: 'short', timeZone: MATCH_TZ } as const
  if (iso) {
    return new Intl.DateTimeFormat('ko-KR', { ...base, hour: '2-digit', minute: '2-digit', hour12: false }).format(
      new Date(iso),
    )
  }
  // 날짜만: 한국 정오로 두어 어느 시간대에서 계산해도 같은 날짜가 나오게
  return `${new Intl.DateTimeFormat('ko-KR', base).format(new Date(`${date}T12:00:00+09:00`))} · 시간 확인 중`
}
