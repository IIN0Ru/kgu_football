/**
 * 경기 일정 페이지 데이터: matches.json 을 그대로 쓰고 상태만 계산 (한국 시간 기준)
 * - played: 점수 있음 / upcoming: 아직 안 지남(시각 확정은 시작 후 2시간까지, 미정은 당일까지)
 * - pending: 날짜는 지났는데 점수가 아직 없음 → '결과 확인 중' (지어내지 않음)
 * - 연기·취소로 표시한 경기는 공개 화면에 보이지 않음 (따로 표시하지 않기로 함, 사용자 결정 2026-10-14).
 *   연기 경기는 새 날짜가 정해지면 관리자가 날짜를 고치고 '예정'으로 돌리면 다시 보임
 */
import season from './matches.json'
import { ourTeam, pageOpenedAt, type SeasonMatch } from './home'
import { isStillUpcoming } from '@/lib/match-time'

export type MatchStatus = 'played' | 'upcoming' | 'pending'

export interface ScheduleMatch extends Omit<SeasonMatch, 'status'> {
  status: MatchStatus
  side: '홈' | '원정'
  opponent: string
}

export const scheduleCompetition = season.competition
export const scheduleSource = season.source
export const scheduleUpdatedAt = season.updatedAt

export const scheduleMatches: ScheduleMatch[] = (season.matches as SeasonMatch[]).filter((m) => !m.status).map((m) => {
  const home = m.home === ourTeam
  const status: MatchStatus =
    m.homeScore !== null && m.awayScore !== null
      ? 'played'
      : isStillUpcoming(m.date, m.time, pageOpenedAt)
        ? 'upcoming'
        : 'pending'
  return { ...m, status, side: home ? '홈' : '원정', opponent: home ? m.away : m.home }
})

/** 가장 가까운 남은 경기 (강조용) */
export const nextScheduleMatch = scheduleMatches.find((m) => m.status === 'upcoming') ?? null
