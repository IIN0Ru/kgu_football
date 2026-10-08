import type { HeroNavItem } from '@/components/ui/prisma-hero'

/** 위 메뉴 탭: 홈 안 구역 이동만 (지금 보는 구역 표시와 같은 역할이라 다른 페이지 링크는 넣지 않음 — 사용자 결정 2026-10-08) */
export const navItems: HeroNavItem[] = [
  { label: '소식', href: '#news' },
  { label: '최근 결과', href: '#result' },
  { label: '다음 경기', href: '#next-match' },
  { label: '선수단', href: '#squad' },
]

/** 메뉴 탭 옆 '페이지' 버튼에서 여는 목록. 만든 페이지만 넣음 (준비 중인 페이지는 넣지 않음) */
export interface PageLink {
  label: string
  href: string
  description: string
}
export const pageLinks: PageLink[] = [
  { label: '홈', href: '/', description: '소식·최근 결과·다음 경기·선수단' },
  { label: '경기 일정', href: '/schedule', description: '시즌 전체 경기, 캘린더에 넣기' },
  { label: '시즌 기록', href: '/records', description: '순위·경기별 득실·선수 기록' },
]
