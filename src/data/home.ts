/**
 * 홈 화면 데이터.
 * 실제 정보가 확인되지 않은 항목은 지어내지 않고 "확인 중" 또는 "(예시)"로 둔다.
 * 나중에 서버(API)로 바꿀 때 이 파일만 교체하면 되도록 화면 코드와 분리.
 */

import season from './matches.json'
import rosterData from './roster.json'

export interface NextMatch {
  competition: string
  home: string
  away: string
  /** 경기 시작 시각 (ISO, 예: '2026-10-18T15:00:00+09:00'). 모르면 null → "일정 발표 전" 표시 */
  kickoff: string | null
  /** 경기장 이름. 모르면 null */
  venue: string | null
  /** 경기대 기준 홈/원정. 모르면 null */
  side: '홈' | '원정' | null
}

/** 우리 학교 표시 이름. 맞대결에서 이 팀을 강조(크림색 원)한다 */
export const ourTeam = '경기대'

/**
 * 경기 일정·결과: src/data/matches.json (출처 KUSF, 반자동 — 경기가 끝나면 이 파일만 고친다).
 * KUSF robots.txt 가 자동 수집을 막고 있어 사람이 확인해 넣는다 (사용자 결정 2026-10-06).
 * '다음 경기'·'최근 결과'·시즌 기록은 방문자가 페이지를 연 시각을 기준으로 아래에서 계산된다.
 */
export interface SeasonMatch {
  date: string
  time: string | null
  venue: string | null
  home: string
  away: string
  homeScore: number | null
  awayScore: number | null
}

export const matchSource = season.source
const matches = season.matches as SeasonMatch[]
const kickoffOf = (m: SeasonMatch) => `${m.date}T${m.time ?? '00:00'}:00+09:00`
const played = matches.filter((m) => m.homeScore !== null && m.awayScore !== null)

function toNextMatch(m: SeasonMatch | undefined): NextMatch {
  if (!m) return { competition: season.competition, home: ourTeam, away: '확인 중', kickoff: null, venue: null, side: null }
  return {
    competition: season.competition,
    home: m.home,
    away: m.away,
    kickoff: m.time ? kickoffOf(m) : null,
    venue: m.venue,
    side: m.home === ourTeam ? '홈' : '원정',
  }
}

/** 점수가 아직 없고, 시작 시각이 지금부터 2시간 전 이후인 첫 경기 (경기 중에도 '오늘 경기'로 보이게) */
export const nextMatch = toNextMatch(
  matches.find((m) => m.homeScore === null && new Date(kickoffOf(m)).getTime() > Date.now() - 2 * 3_600_000),
)

const last = played[played.length - 1]
const weekday = (d: string) => new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(`${d}T12:00:00+09:00`))

/** 점수가 들어간 마지막 경기. 없으면 null */
export const recentResult = last
  ? {
      competition: season.competition,
      date: `${Number(last.date.slice(5, 7))}월 ${Number(last.date.slice(8))}일 (${weekday(last.date)})`,
      venue: last.venue,
      home: { name: last.home, score: last.homeScore as number },
      away: { name: last.away, score: last.awayScore as number },
    }
  : null

/** 최근 결과 아래 작은 목록: 가장 최근 경기를 뺀 그 이전 4경기 (최신순) */
export interface PastMatch {
  date: string
  opponent: string
  side: '홈' | '원정'
  ours: number
  theirs: number
}
export const earlierResults: PastMatch[] = played
  .slice(-5, -1)
  .reverse()
  .map((m) => {
    const home = m.home === ourTeam
    return {
      date: `${Number(m.date.slice(5, 7))}.${Number(m.date.slice(8))}`,
      opponent: home ? m.away : m.home,
      side: home ? '홈' : '원정',
      ours: (home ? m.homeScore : m.awayScore) as number,
      theirs: (home ? m.awayScore : m.homeScore) as number,
    }
  })

/** 시즌 기록 (경기대 기준) */
export const seasonRecord = played.reduce(
  (r, m) => {
    const [ours, theirs] = m.home === ourTeam ? [m.homeScore!, m.awayScore!] : [m.awayScore!, m.homeScore!]
    if (ours > theirs) r.win++
    else if (ours < theirs) r.loss++
    else r.draw++
    r.goalsFor += ours
    r.goalsAgainst += theirs
    return r
  },
  { win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0 },
)

/** 선수 명단: src/data/roster.json (KUFC 공개 페이지에서 주 1회 자동 갱신, 이름·번호·포지션·학년만) */
export type Position = 'GK' | 'DF' | 'MF' | 'FW'
export interface Player {
  number: number | null
  name: string
  position: Position
  grade: number | null
}
export const roster = {
  source: rosterData.source,
  updatedAt: rosterData.updatedAt,
  players: rosterData.players as Player[],
}

export interface NewsItem {
  title: string
  /** 짧은 요약 (첫 번째 소식만 크게 보여줄 때 사용) */
  summary?: string
  /** 분류: 경기 / 선수단 / 공지 등 */
  category: string
  /** 게시일 (YYYY-MM-DD). 모르면 생략 */
  date?: string
  /** 출처 이름 (기사 매체, 인스타그램 등) */
  source?: string
  href: string
}

/** 실제 기사가 들어오기 전까지 예시. 링크는 축구부 인스타그램으로 */
export const news: NewsItem[] = [
  {
    title: '소식 제목 1 (예시)',
    summary: '실제 기사나 공지가 정해지면 이 자리에 두세 줄 요약이 들어갑니다. (예시)',
    category: '경기',
    source: '예시',
    href: 'https://www.instagram.com/kgu_football/',
  },
  { title: '소식 제목 2 (예시)', category: '선수단', source: '예시', href: 'https://www.instagram.com/kgu_football/' },
  { title: '소식 제목 3 (예시)', category: '공지', source: '예시', href: 'https://www.instagram.com/kgu_football/' },
]

export const instagramUrl = 'https://www.instagram.com/kgu_football/'

const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}`

/** 첫 화면 배경 사진. 출처: 경기대학교 홈페이지 (출처 표기 조건, 사용자 확인 2026-10-06) */
export const heroImage = {
  webpSrcSet: `${img('campus-aerial-1200.webp')} 1200w, ${img('campus-aerial-2000.webp')} 2000w`,
  jpgSrcSet: `${img('campus-aerial-1200.jpg')} 1200w, ${img('campus-aerial-2000.jpg')} 2000w`,
  src: img('campus-aerial-2000.jpg'),
  alt: '경기대학교 캠퍼스와 축구장을 위에서 내려다본 사진',
}

export const photoCredit = {
  label: '경기대학교',
  url: 'https://www.kyonggi.ac.kr/',
}
