/**
 * 시즌 기록 페이지 데이터 (2026-10-08)
 * - records.json: KUSF 4권역 순위표 + 경기별 '경기대 선수기록'. KUSF robots.txt 가 자동 수집을 막아 사람이 옮겨 넣음
 * - 경기 결과(점수·홈/원정)는 matches.json 하나만 기준으로 삼고, 여기서는 선수 기록을 날짜로 붙임
 * - 선수 기록의 '명단 포함 경기 수'는 교체 명단까지 포함한 수 (실제로 뛰었는지는 KUSF 기록에 없음)
 * - 도움은 KUSF 기록 그대로 (지금은 모두 0). 선수 기록에 없는 득점(자책골 추정)은 unattributedGoals
 */
import records from './records.json'
import { ourTeam } from './home'
import { scheduleMatches } from './schedule'

export interface PlayerLine {
  number: number
  name: string
  goals: number
  assists: number
  yellow: number
  red: number
}

export interface Standing {
  team: string
  rank: number
  played: number
  points: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  yellow: number
  red: number
}

export const recordsSource = records.source
export const recordsUpdatedAt = records.updatedAt
export const recordsCompetition = records.competition
export const standings = records.standings as Standing[]
export const ourStanding = standings.find((s) => s.team === ourTeam) ?? null

const lineups = new Map(
  (records.matches as { date: string; players: PlayerLine[]; unattributedGoals: number }[]).map((m) => [m.date, m]),
)

/** 끝난 경기 흐름 (날짜순): 득점·실점은 matches.json 기준 */
export interface MatchFlow {
  date: string
  opponent: string
  side: '홈' | '원정'
  goalsFor: number
  goalsAgainst: number
  unattributedGoals: number
}

export const matchFlow: MatchFlow[] = scheduleMatches
  .filter((m) => m.status === 'played')
  .map((m) => {
    const home = m.side === '홈'
    return {
      date: m.date,
      opponent: m.opponent,
      side: m.side,
      goalsFor: (home ? m.homeScore : m.awayScore) ?? 0,
      goalsAgainst: (home ? m.awayScore : m.homeScore) ?? 0,
      unattributedGoals: lineups.get(m.date)?.unattributedGoals ?? 0,
    }
  })

export interface SideRecord {
  side: '홈' | '원정'
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
}

export const sideRecords: SideRecord[] = (['홈', '원정'] as const).map((side) => {
  const list = matchFlow.filter((m) => m.side === side)
  return {
    side,
    played: list.length,
    won: list.filter((m) => m.goalsFor > m.goalsAgainst).length,
    drawn: list.filter((m) => m.goalsFor === m.goalsAgainst).length,
    lost: list.filter((m) => m.goalsFor < m.goalsAgainst).length,
    goalsFor: list.reduce((n, m) => n + m.goalsFor, 0),
    goalsAgainst: list.reduce((n, m) => n + m.goalsAgainst, 0),
  }
})

/** 선수 시즌 합계: 득점 많은 순 → 명단 포함 경기 수 → 등번호 */
export interface PlayerSeason extends PlayerLine {
  listed: number
}

export const playerSeason: PlayerSeason[] = (() => {
  const byName = new Map<string, PlayerSeason>()
  for (const m of matchFlow) {
    for (const p of lineups.get(m.date)?.players ?? []) {
      const cur = byName.get(p.name) ?? { ...p, goals: 0, assists: 0, yellow: 0, red: 0, listed: 0 }
      cur.number = p.number // 가장 최근 경기의 등번호
      cur.goals += p.goals
      cur.assists += p.assists
      cur.yellow += p.yellow
      cur.red += p.red
      cur.listed += 1
      byName.set(p.name, cur)
    }
  }
  return [...byName.values()].sort((a, b) => b.goals - a.goals || b.listed - a.listed || a.number - b.number)
})()

/** 순위표·선수 기록이 반영된 마지막 경기 날짜. KUSF 기록은 경기 뒤 한참 있다 열려서,
 *  점수(matches.json)는 먼저 들어오고 순위표·선수 기록은 늦게 들어올 수 있음 (2026-10-09) */
export const recordsThrough = [...lineups.keys()].sort().at(-1) ?? null
/** 점수는 있지만 순위표·선수 기록이 아직 안 들어온 경기 */
export const recordsPending = matchFlow.filter((m) => !lineups.has(m.date))

/** 시즌 승무패·득실점: 점수(matches.json) 기준이라 순위표보다 먼저 최신이 됨 */
export const seasonTotals = matchFlow.reduce(
  (t, m) => {
    t.played++
    if (m.goalsFor > m.goalsAgainst) t.won++
    else if (m.goalsFor === m.goalsAgainst) t.drawn++
    else t.lost++
    t.goalsFor += m.goalsFor
    t.goalsAgainst += m.goalsAgainst
    return t
  },
  { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
)

export const unattributedTotal = matchFlow.reduce((n, m) => n + m.unattributedGoals, 0)
