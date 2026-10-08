import type { HeroNavItem } from '@/components/ui/prisma-hero'

/** 위 메뉴 탭 항목. '#…' 는 홈 안 구역, '/…' 는 다른 페이지 (2026-10-08 일정 페이지 추가 — 시안) */
export const navItems: HeroNavItem[] = [
  { label: '소식', href: '#news' },
  { label: '최근 결과', href: '#result' },
  { label: '일정', href: '/schedule' },
  { label: '선수단', href: '#squad' },
]
