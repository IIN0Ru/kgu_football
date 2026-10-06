/**
 * 홈 화면 데이터.
 * 실제 정보가 확인되지 않은 항목은 지어내지 않고 "확인 중" 또는 "(예시)"로 둔다.
 * 나중에 서버(API)로 바꿀 때 이 파일만 교체하면 되도록 화면 코드와 분리.
 */

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

export const nextMatch: NextMatch = {
  competition: 'U리그',
  home: '경기대',
  away: '상대팀',
  kickoff: null,
  venue: null,
  side: null,
}

export const recentResult = {
  competition: 'U리그',
  home: { name: '경기대', score: 3 },
  away: { name: '칼빈대', score: 2 },
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
