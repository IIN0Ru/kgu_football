/**
 * 홈 화면 데이터.
 * 실제 정보가 확인되지 않은 항목은 지어내지 않고 "확인 중" 또는 "(예시)"로 둔다.
 * 나중에 서버(API)로 바꿀 때 이 파일만 교체하면 되도록 화면 코드와 분리.
 */

export const nextMatch = {
  competition: 'U리그',
  home: '경기대',
  away: '상대팀',
  date: '일정 확인 중',
  venue: '장소 확인 중',
}

export const recentResult = {
  competition: 'U리그',
  home: { name: '경기대', score: 3 },
  away: { name: '칼빈대', score: 2 },
}

export const news = [
  { title: '소식 제목 1 (예시)', href: '#news' },
  { title: '소식 제목 2 (예시)', href: '#news' },
  { title: '소식 제목 3 (예시)', href: '#news' },
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
