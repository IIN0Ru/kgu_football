/**
 * 히어로가 화면 밖으로 나가면, 히어로의 검은 메뉴 탭이 화면 위에 붙어 따라온다.
 * 지금 보고 있는 구역 아래로 크림색 알약이 미끄러져 이동한다 (같은 메뉴가 계속 이어진다는 느낌).
 */
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { HeroNavItem } from '@/components/ui/prisma-hero'

const EASE = [0.16, 1, 0.3, 1] as const

interface DockNavProps {
  items: HeroNavItem[]
  /** 이 id의 요소(히어로)가 화면에서 사라지면 메뉴가 나타남 */
  heroId: string
}

export function DockNav({ items, heroId }: DockNavProps) {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  // 히어로가 거의 다 지나가면 메뉴 표시
  useEffect(() => {
    const hero = document.getElementById(heroId)
    if (!hero) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio < 0.15), {
      threshold: [0, 0.15, 0.5, 1],
    })
    io.observe(hero)
    return () => io.disconnect()
  }, [heroId])

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

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          aria-label="빠른 이동"
          className="fixed left-1/2 top-0 z-50 -translate-x-1/2"
          initial={reduce ? { opacity: 0 } : { y: '-100%' }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: '-100%' }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <LayoutGroup>
            <div className="flex items-center gap-1 rounded-b-2xl bg-black p-1.5 md:rounded-b-3xl">
              {items.map((item) => {
                const isActive = item.href === `#${active}`
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    aria-current={isActive ? 'location' : undefined}
                    onClick={() => {
                      if (item.href.startsWith('#')) {
                        setActive(item.href.slice(1))
                        lockUntil.current = performance.now() + 1200
                      }
                    }}
                    className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors duration-200 md:px-4 md:text-sm ${
                      isActive ? 'text-black' : 'text-cream/80 hover:text-cream'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="dock-pill"
                        className="absolute inset-0 rounded-full bg-cream"
                        transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </a>
                )
              })}
            </div>
          </LayoutGroup>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
