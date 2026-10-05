/**
 * 첫 화면(히어로) 전용 한 번에 넘기기.
 * - 맨 위에서 휠을 한 칸 내리거나, 위로 쓸어올리거나, ↓·PageDown·Space를 누르면
 *   히어로가 페이드아웃되면서 다음 구역(카드들)으로 미끄러지듯 이동
 * - 다음 구역의 맨 위에서 휠을 올리면 다시 첫 화면으로 돌아오며 페이드인
 * - 그 아래 구역들은 평소처럼 자유롭게 스크롤
 */
import { animate, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

// 화면 이동은 천천히 출발해 천천히 멈추게 해서, 첫 화면이 사라지는 모습이 보이도록
const GLIDE_EASE = [0.65, 0, 0.35, 1] as const
const DURATION = 1.0

export function useHeroSnap(heroId: string) {
  const reduce = useReducedMotion()
  const [away, setAway] = useState(false)
  const busy = useRef(false)

  const heroHeight = () => document.getElementById(heroId)?.offsetHeight ?? window.innerHeight

  const glideTo = useCallback(
    (target: number, nextAway: boolean) => {
      if (busy.current) return
      busy.current = true
      setAway(nextAway)
      const controls = animate(window.scrollY, target, {
        duration: reduce ? 0 : DURATION,
        ease: GLIDE_EASE,
        onUpdate: (v) => window.scrollTo({ top: v, behavior: 'instant' }),
      })
      controls.then(() => {
        window.scrollTo({ top: target, behavior: 'instant' })
        // 관성 스크롤 끝물이 다시 전환을 일으키지 않도록 잠깐 더 잠금
        window.setTimeout(() => (busy.current = false), 250)
      })
    },
    [reduce],
  )

  const goNext = useCallback(() => glideTo(heroHeight(), true), [glideTo])
  const goHome = useCallback(() => glideTo(0, false), [glideTo])

  useEffect(() => {
    const atTop = () => window.scrollY < 4
    // 다음 구역의 맨 윗부분(히어로 바로 아래)에 있는지
    const justBelowHero = () => {
      const h = heroHeight()
      return window.scrollY > 4 && window.scrollY <= h + 4
    }

    const onWheel = (e: WheelEvent) => {
      if (busy.current) {
        if (window.scrollY < heroHeight() + 4) e.preventDefault()
        return
      }
      if (e.deltaY > 0 && atTop()) {
        e.preventDefault()
        goNext()
      } else if (e.deltaY < 0 && justBelowHero()) {
        e.preventDefault()
        goHome()
      }
    }

    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null) return
      const dy = touchY - (e.touches[0]?.clientY ?? touchY)
      if (busy.current) {
        if (window.scrollY < heroHeight() + 4) e.preventDefault()
        return
      }
      if (dy > 24 && atTop()) {
        e.preventDefault()
        touchY = null
        goNext()
      } else if (dy < -24 && justBelowHero()) {
        e.preventDefault()
        touchY = null
        goHome()
      }
    }

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)
      const up = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)
      if (down && atTop()) {
        e.preventDefault()
        goNext()
      } else if (up && justBelowHero()) {
        e.preventDefault()
        goHome()
      }
    }

    // 스크롤바를 끌거나 메뉴로 이동해 첫 화면 쪽으로 돌아오면 다시 보이게
    const onScroll = () => {
      if (busy.current) return
      // 첫 화면이 조금이라도 다시 보이면 페이드인
      setAway(window.scrollY >= heroHeight() - 4)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [goNext, goHome])

  return { away, goNext }
}
