/**
 * 화면 위 가운데에 늘 붙어 있는 메뉴 탭 (첫 화면부터 그대로, 2026-10-07 변경).
 * 왼쪽 끝은 경기대 로고 자리 — 로고 그림은 floating-logo.tsx 가 그 자리에 그린다.
 * 지금 보고 있는 구역 아래로 빨간 알약이 미끄러져 이동한다 (같은 메뉴가 계속 이어진다는 느낌).
 * 2026-10-08 여러 페이지 (사용자 결정): 탭은 홈 안 구역 이동·현재 위치 표시만 맡고,
 * 다른 페이지로 가는 입구는 탭 옆 '페이지' 버튼(pages-menu.tsx)으로 분리.
 * 홈이 아닌 페이지(pageTitle)에서는 탭에 로고 · 홈 · 지금 페이지 이름만 보여줌.
 * 그 페이지에는 날아오는 큰 로고가 없으므로 staticLogo 로 탭 안에 로고를 바로 그린다(누르면 홈).
 */
import { LayoutGroup, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { PagesMenu } from '@/components/pages-menu'
import type { PageLink } from '@/data/nav'
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
  /** 홈이 아닌 페이지: 탭 안에 로고를 바로 그림 (누르면 홈) */
  staticLogo?: { src: string; alt: string }
  /** 홈이 아닌 페이지의 이름. 있으면 탭에 구역 메뉴 대신 '홈 · 페이지 이름' */
  pageTitle?: string
  /** 탭 옆 '페이지' 버튼 목록 */
  pages?: PageLink[]
}

export function DockNav({ items, logo, heroId, onNavigate, staticLogo, pageTitle, pages }: DockNavProps) {
  const reduce = useReducedMotion()
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const [active, setActive] = useState<string | null>(null)

  // 지금 보고 있는 구역: 화면 위쪽 1/3 지점을 이미 지난 구역 중 마지막 것
  // (같은 줄에 나란히 놓인 구역은 왼쪽 것 우선, 마지막 구역이 기준선에 못 닿은 채 맨 아래면 마지막 구역)
  // 메뉴를 눌렀을 땐 누른 구역을 바로 표시하고 이동이 끝날 때까지 유지
  const lockUntil = useRef(0)
  useEffect(() => {
    if (!onHome) return
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
  }, [items, onHome])

  const links = items.map((item) => {
    const isRoute = item.href.startsWith('/')
    const isActive = onHome ? item.href === `#${active}` : isRoute && item.href === pathname
    const cls = `tap-area relative whitespace-nowrap rounded-full px-[7px] py-1.5 text-xs transition-colors duration-200 min-[400px]:px-2.5 sm:px-3 md:px-4 md:text-sm ${
      isActive ? 'text-on-accent' : 'text-fg/70 hover:text-fg'
    }`
    const inner = (
      <>
        {isActive && (
          <motion.span
            layoutId="dock-pill"
            className="absolute inset-0 rounded-full bg-accent"
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
          />
        )}
        {item.short ? (
          <>
            <span className="relative hidden min-[400px]:inline">{item.label}</span>
            <span className="relative min-[400px]:hidden" aria-hidden="true">
              {item.short}
            </span>
            <span className="sr-only min-[400px]:hidden">{item.label}</span>
          </>
        ) : (
          <span className="relative">{item.label}</span>
        )}
      </>
    )
    // 다른 페이지로 가거나, 홈이 아닌 곳에서 홈 구역으로 갈 때는 페이지 이동
    if (isRoute || !onHome) {
      return (
        <Link
          key={item.label}
          to={isRoute ? item.href : { pathname: '/', hash: item.href }}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onNavigate?.()}
          className={cls}
        >
          {inner}
        </Link>
      )
    }
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
        className={cls}
      >
        {inner}
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
  const logoEl = staticLogo ? (
    <Link
      to="/"
      aria-label={`${staticLogo.alt} — 홈으로`}
      className="flex shrink-0 items-center self-stretch pl-0.5 pr-3"
      style={{ width: full }}
    >
      <img src={staticLogo.src} alt="" className="block h-auto max-w-none" style={{ width: full >= 70 ? 56 : 40 }} />
    </Link>
  ) : logo && (
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
        <div className="flex items-stretch gap-1.5">
          <div className="surface-blur flex items-center gap-1 rounded-b-2xl border border-t-0 border-line bg-bar px-1.5 py-[12px] md:rounded-b-3xl md:py-[14px]">
            {logoEl}
            {pageTitle ? (
              <>
                <Link
                  to="/"
                  className="flex items-center gap-0.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs text-fg/70 transition-colors hover:text-fg md:text-sm"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />홈
                </Link>
                <span aria-hidden="true" className="text-fg/30">·</span>
                <span aria-current="page" className="whitespace-nowrap px-2.5 py-1.5 text-xs font-medium md:text-sm">
                  {pageTitle}
                </span>
              </>
            ) : (
              links
            )}
          </div>
          {pages && pages.length > 0 && <PagesMenu pages={pages} onNavigate={onNavigate} />}
        </div>
      </LayoutGroup>
    </motion.nav>
  )
}
