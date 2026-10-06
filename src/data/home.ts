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
const upcoming = matches.filter(
  (m) => m.homeScore === null && new Date(kickoffOf(m)).getTime() > Date.now() - 2 * 3_600_000,
)
export const nextMatch = toNextMatch(upcoming[0])

/** 다음 경기 카드 아래 작은 목록: 그다음 경기들 (최대 3개, 날짜순) */
export interface LaterMatch {
  date: string
  time: string | null
  opponent: string
  side: '홈' | '원정'
  venue: string | null
}
export const laterMatches: LaterMatch[] = upcoming.slice(1, 4).map((m) => {
  const home = m.home === ourTeam
  return {
    date: `${Number(m.date.slice(5, 7))}.${Number(m.date.slice(8))}`,
    time: m.time,
    opponent: home ? m.away : m.home,
    side: home ? '홈' : '원정',
    venue: m.venue,
  }
})

const last = played[played.length - 1]
const weekday = (d: string) => new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(`${d}T12:00:00+09:00`))

/** 점수가 들어간 마지막 경기. 없으면 null */
export const recentResult = last
  ? {
      competition: season.competition,
      date: `${Number(last.date.slice(5, 7))}월 ${Number(last.date.slice(8))}일 (${weekday(last.date)})`,
      shortDate: `${Number(last.date.slice(5, 7))}.${Number(last.date.slice(8))}`,
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
  /** 대표 사진 주소 (지금은 쓰지 않음, 사용자 결정 2026-10-06) */
  image?: string
}

/**
 * 최신 소식: 경기대 축구부 네이버 블로그(blog.naver.com/orangeturtles)의 [KGU series] 인터뷰 최신 5개
 * - 블로그 RSS는 robots.txt 가 자동 수집을 막고 작업 환경에서도 네이버 접속이 막혀 있어,
 *   사용자가 준 글 주소 + 글 화면 캡처를 보고 사람이 옮겨 넣음 (2026-10-06, NOTES #26)
 * - 요약은 각 글 첫 소개 문단의 앞 문장을 그대로 옮김. 첫 문단이 캡처에 없는 글은 비움
 * - 사진은 넣지 않음 (사용자 결정)
 * - 새 글이 올라오면 맨 위에 추가하고 맨 아래를 지움 (5개 유지)
 */
const blogPost = (logNo: string) => `https://blog.naver.com/orangeturtles/${logNo}`

export const news: NewsItem[] = [
  {
    title: '[KGU series 12] 가야대전 멀티골의 주인공! 경기대학교 서민준 선수 단독 인터뷰',
    summary:
      '이번 제21회 1·2학년 대학축구연맹전 황가람기에서 경기대 축구부의 스코어보드를 가장 뜨겁게 달군 인물, 바로 1학년 서민준 선수입니다.',
    category: '인터뷰',
    source: '축구부 블로그',
    date: '2026-10-06',
    href: blogPost('224432818144'),
  },
  {
    title: '[KGU series 11] U리그 4권역 최다 득점팀, 캡틴 갈정민의 당찬 포부',
    category: '인터뷰',
    source: '축구부 블로그',
    date: '2026-06-09',
    href: blogPost('224310428052'),
  },
  {
    title: '[KGU series 10] 득점왕의 탄생, 경기대의 새로운 심장, 유태호 선수',
    summary: "2026년, 경기대학교 축구부의 전방에 새로운 활력을 불어넣은 '무서운 신예'가 등장했습니다.",
    category: '인터뷰',
    source: '축구부 블로그',
    date: '2026-03-30',
    href: blogPost('224234051023'),
  },
  {
    title: "[KGU series 9] '동시 득점왕' 타이틀을 넘어 국가대표를 꿈꾸다, 김기완 선수",
    summary: '2026년의 시작을 알리는 무대에서 경기대학교 축구부는 가장 날카로운 창을 발견했습니다.',
    category: '인터뷰',
    source: '축구부 블로그',
    date: '2026-03-21',
    href: blogPost('224224694941'),
  },
  {
    title: '[KGU series 8] 2026시즌 경기대학교 축구부 캡틴, 갈정민 선수',
    summary:
      '2026년 새 시즌을 앞둔 경기대학교 축구부에게 이번 동계 대회 새로운 리더십과 팀의 결속력을 다지는 중요한 변환점이었습니다.',
    category: '인터뷰',
    source: '축구부 블로그',
    date: '2026-03-16',
    href: blogPost('224217933083'),
  },
]

/**
 * 매거진: 축구부 인터뷰 매거진 (링크트리 linktr.ee/kgu_turtles 에 올라온 순서, 2026-10-06 확인)
 * - 링크트리 robots.txt 가 자동 수집을 막아 사람이 옮겨 넣음. 날짜·요약은 공개 정보가 없어 비움. 사진 없음
 */
const issue = (id: string) => `https://online.fliphtml5.com/qsilo/${id}/`

export const magazine: NewsItem[] = [
  { title: '권오성 인터뷰', category: '인터뷰', source: '축구부 매거진', href: issue('svrh') },
  { title: '장재원 인터뷰', category: '인터뷰', source: '축구부 매거진', href: issue('itlw') },
  { title: '새내기 인터뷰', category: '인터뷰', source: '축구부 매거진', href: issue('nqez') },
  { title: '보이지 않는 끈으로 연결된, 경기대의 베스트 듀오', category: '인터뷰', source: '축구부 매거진', href: issue('unrd') },
  { title: '룸메이트 고발장: 기숙사 TMI 토크', category: '인터뷰', source: '축구부 매거진', href: issue('xirc') },
]

export const magazineUrl = 'https://linktr.ee/kgu_turtles'

/**
 * 축구부 유튜브 채널 (사용자 전달 2026-10-06). 채널 ID는 채널 페이지 canonical 주소로 확인
 * 최신 영상: 유튜브 공식 퍼가기(embed)로 채널의 "업로드" 재생목록(UC… → UU…)을 띄움.
 * 첫 영상이 항상 가장 최근 업로드라 새 영상이 올라오면 자동으로 바뀜 (수집 아님, 유튜브 플레이어가 직접 불러옴)
 */
export const youtubeUrl = 'https://www.youtube.com/@KGU_TURTLES'
const youtubeChannelId = 'UC4aARbVyxSRphfzcgx59BsQ'
export const youtubeLatestEmbed = `https://www.youtube-nocookie.com/embed/videoseries?list=UU${youtubeChannelId.slice(2)}&rel=0`

/** 축구부 채널 (링크트리 기준) */
export const blogUrl = 'https://blog.naver.com/orangeturtles'

export const instagramUrl = 'https://www.instagram.com/kgu_football/'

const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}`

/** 첫 화면 배경 사진. 출처: 경기대학교 홈페이지 (출처 표기 조건, 사용자 확인 2026-10-06) */
export const heroImage = {
  webpSrcSet: `${img('campus-aerial-1200.webp')} 1200w, ${img('campus-aerial-2000.webp')} 2000w`,
  jpgSrcSet: `${img('campus-aerial-1200.jpg')} 1200w, ${img('campus-aerial-2000.jpg')} 2000w`,
  src: img('campus-aerial-2000.jpg'),
  alt: '경기대학교 캠퍼스와 축구장을 위에서 내려다본 사진',
}

/** 첫 화면 큰 로고: 경기대학교 UI(1947) 로고 (사용자 전달 2026-10-06, 경기대 UI 페이지의 공식 로고).
 *  src: 사진 위에서 읽히도록 검은 글자(1947·KGU·KYONGGI UNIVERSITY)만 크림색으로 바꾼 판 (사용자 선택)
 *  darkSrc: 원본 (스크롤해서 왼쪽 위 밝은 화면에 있을 때) */
export const heroLogo = {
  src: img('kgu-logo-1947-light.png'),
  darkSrc: img('kgu-logo-1947.png'),
  alt: 'KGU 경기대학교 (1947, KYONGGI UNIVERSITY)',
}

export const photoCredit = {
  label: '경기대학교',
  url: 'https://www.kyonggi.ac.kr/',
}
