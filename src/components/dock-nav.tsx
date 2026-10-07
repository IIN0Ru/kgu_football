/**
 * 화면 위 가운데에 늘 붙어 있는 메뉴 탭 (첫 화면부터 그대로, 2026-10-07 변경).
 * 왼쪽 끝은 경기대 로고 자리 — 로고 그림은 floating-logo.tsx 가 그 자리에 그린다.
 * 지금 보고 있는 구역 아래로 크림색 알약이 미끄러져 이동한다 (같은 메뉴가 계속 이어진다는 느낌).
 */
import { LayoutGroup, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { HeroNavItem } from '@/components/ui/prisma-hero'

const EASE = [0.16, 1, 0.3, 1] as const

interface DockNavProps {
  items: HeroNavItem[]
  /** 첫 화면(히어로) id — 로고 자리를 넓히는 기준 높이 */
  heroId?: string
  /** 탭 왼쪽 끝 로고 자리 (첫 화면 큰 로고가 날아와 이 자리에 머묾) */
  logo?: { id: string }
  /** 메뉴를 누를 때 먼저 부름: 진행 중인 첫 화면 넘김을 취소해 메뉴 이동이 이기게 (use-hero-snap cancel) */
  onNavigate?: () => void
}

export function DockNav({ items, logo, heroId, onNavigate }: DockNavProps) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<string | null>(null)

  // 지금 보고 있는 구역: 화면 위쪽 1/3 지점을 이미 지난 구역 중 마지막 것
  // (같은 줄에 나란히 놓인 구역은 왼쪽 것 우선, 마지막 구역이 기준선에 못 닿은 채 맨 아래면 마지막 구역)
  // 메뉴를 눌렀을 땐 누른 구역을 바로 표시하고 이동이 끝날 때까지 유지
  const lockUntil = useRef(0)
  useEffect(() => {
    const ids = items.filter((i) => i.href.startsWith('#')).map((i) => i.href.slice(1))
    let raf = 0
    const update = () => {
      raf = 0
      if (performance.now() < lockUntil.current) return
      const line = window.innerHeight * 0.33
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let current: string | null = null
      let currentTop = -Infinity
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = Math.round(el.getBoundingClientRect().top)
        if (top <= line && top > currentTop) {
          current = id
          currentTop = top
        }
      }
      const last = ids.length ? document.getElementById(ids[ids.length - 1]) : null
      if (atBottom && last && last.getBoundingClientRect().top > line) current = ids[ids.length - 1]
      setActive(current)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [items])

  const links = items.map((item) => {
    const isActive = item.href === `#${active}`
    return (
      <a
        key={item.label}
        href={item.href}
        aria-current={isActive ? 'location' : undefined}
        onClick={() => {
          onNavigate?.()
          if (item.href.startsWith('#')) {
            setActive(item.href.slice(1))
            lockUntil.current = performance.now() + 1200
          }
        }}
        className={`relative whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs transition-colors duration-200 sm:px-3 md:px-4 md:text-sm ${
          isActive ? 'text-on-accent' : 'text-fg/70 hover:text-fg'
        }`}
      >
        {isActive && (
          <motion.span
            layoutId="dock-pill"
            className="absolute inset-0 rounded-full bg-accent"
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
          />
        )}
        <span className="relative">{item.label}</span>
      </a>
    )
  })
  // 로고 자리: 첫 화면에서는 폭 0, 스크롤해서 첫 화면을 지나갈수록 넓어짐.
  // 큰 로고(floating-logo)가 같은 속도로 날아와 이 자리에 머묾 → 탭이 로고를 받아들이듯 자연스럽게 벌어짐
  const { scrollY } = useScroll()
  const [full, setFull] = useState(66)
  useEffect(() => {
    const f = () => setFull(window.innerWidth >= 768 ? 56 + 14 : 40 + 12)
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  const slotWidth = useTransform(scrollY, (y) => {
    const hero = document.getElementById(heroId ?? '')
    const h = hero?.offsetHeight ?? window.innerHeight
    const top = hero?.offsetTop ?? 0 // 위에 0페이지가 있으면 그만큼 뒤에서 시작
    return Math.min(1, Math.max(0, (y - top) / h)) * full
  })
  const logoEl = logo && (
    <motion.span
      id={logo.id}
      data-full={full}
      aria-hidden="true"
      className="block shrink-0 self-stretch"
      style={{ width: slotWidth }}
    />
  )

  // 메뉴 탭은 첫 화면부터 늘 같은 자리에 고정 (사용자 요청 2026-10-07)
  return (
    <motion.nav
      aria-label="빠른 이동"
      className="fixed left-1/2 top-0 z-50 -translate-x-1/2"
    >
      <LayoutGroup>
        <div className="surface-blur flex items-center gap-1 rounded-b-2xl border border-t-0 border-line bg-bar px-1.5 py-[12px] md:rounded-b-3xl md:py-[14px]">
          {logoEl}
          {links}
        </div>
      </LayoutGroup>
    </motion.nav>
  )
}
