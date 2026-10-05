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
