/**
 * 맨 위 전체 화면들(0페이지 배너 → 히어로) 한 번에 넘기기.
 * - 화면들의 맨 위(멈춤 지점)에서 휠을 한 칸 내리거나, 위로 쓸어올리거나, ↓·PageDown·Space를 누르면
 *   다음 멈춤 지점으로 미끄러지듯 이동: 0페이지 → 히어로 → 다음 구역(카드들)
 * - 거꾸로 올리면 한 화면씩 되돌아감
 * - 마지막 멈춤 지점(카드들) 아래는 평소처럼 자유롭게 스크롤
 * - 2026-10-07: 0페이지 추가로 화면 하나(heroId) → 여러 개(ids)로 확장 (0페이지는 같은 날 삭제, 지금은 히어로 하나)
 * - 2026-10-07 리뷰 반영: 넘김 도중 메뉴·로고를 누르면 cancel() 로 진행 중인 넘김을 멈추고
 *   사용자가 고른 이동이 이기게 함 (넘김이 1초 동안 스크롤 위치를 계속 덮어써서 로고 '맨 위로'가 무시되던 문제)
 *   취소·해제 때 애니메이션과 잠금 타이머를 정리하고, 배경 상태(away)는 현재 위치로 다시 맞춤
 */
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

// 화면 이동은 천천히 출발해 천천히 멈추게 해서, 첫 화면이 사라지는 모습이 보이도록
const GLIDE_EASE = [0.65, 0, 0.35, 1] as const
const DURATION = 1.0

export function useHeroSnap(ids: string[]) {
  const reduce = useReducedMotion()
  const [away, setAway] = useState(false)
  const busy = useRef(false)
  const glide = useRef<AnimationPlaybackControls | null>(null)
  const unlockTimer = useRef<number | null>(null)

  // 멈춤 지점: 0, 각 전체 화면이 끝나는 위치들
  const stops = useCallback(() => {
    const out = [0]
    let y = 0
    for (const id of ids) {
      y += document.getElementById(id)?.offsetHeight ?? window.innerHeight
      out.push(y)
    }
    return out
  }, [ids])
  const last = useCallback(() => {
    const s = stops()
    return s[s.length - 1]
  }, [stops])

  /** 진행 중인 넘김 애니메이션·잠금 타이머 정리 */
  const stopGlide = useCallback(() => {
    glide.current?.stop()
    glide.current = null
    if (unlockTimer.current !== null) window.clearTimeout(unlockTimer.current)
    unlockTimer.current = null
    busy.current = false
  }, [])

  /** 메뉴·로고 클릭 등 사용자가 고른 이동을 위해 넘김을 취소. 배경 상태는 지금 위치 기준으로 다시 맞춤
   *  (이후 스크롤 이벤트에서도 계속 맞춰짐) */
  const cancel = useCallback(() => {
    if (!busy.current) return
    stopGlide()
    setAway(window.scrollY >= last() - 4)
  }, [stopGlide, last])

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
      glide.current = controls
      controls.then(() => {
        // 도중에 취소됐으면(다른 넘김이 시작됐거나 사용자가 메뉴를 누름) 아무것도 하지 않음
        if (glide.current !== controls) return
        glide.current = null
        window.scrollTo({ top: target, behavior: 'instant' })
        // 관성 스크롤 끝물이 다시 전환을 일으키지 않도록 잠깐 더 잠금
        unlockTimer.current = window.setTimeout(() => {
          unlockTimer.current = null
          busy.current = false
        }, 250)
      })
    },
    [reduce],
  )

  // 화면에서 빠질 때 남은 애니메이션·타이머 정리
  useEffect(() => stopGlide, [stopGlide])

  /** 지금 멈춤 지점에 서 있으면 다음 지점으로 (없으면 false) */
  const goNext = useCallback(() => {
    const s = stops()
    const i = s.findIndex((y) => Math.abs(window.scrollY - y) < 4)
    if (i < 0 || i >= s.length - 1) return false
    glideTo(s[i + 1], i + 1 === s.length - 1)
    return true
  }, [glideTo, stops])
  /** 마지막 지점 이하에 있으면 바로 위 멈춤 지점으로 */
  const goPrev = useCallback(() => {
    const s = stops()
    const y = window.scrollY
    if (y <= 4 || y > s[s.length - 1] + 4) return false
    const prev = [...s].reverse().find((p) => p < y - 4)
    if (prev === undefined) return false
    glideTo(prev, false)
    return true
  }, [glideTo, stops])

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (busy.current) {
        if (window.scrollY < last() + 4) e.preventDefault()
        return
      }
      if (e.deltaY > 0 ? goNext() : e.deltaY < 0 && goPrev()) e.preventDefault()
    }

    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null) return
      const dy = touchY - (e.touches[0]?.clientY ?? touchY)
      if (busy.current) {
        if (window.scrollY < last() + 4) e.preventDefault()
        return
      }
      if ((dy > 24 && goNext()) || (dy < -24 && goPrev())) {
        e.preventDefault()
        touchY = null
      }
    }

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)
      const up = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)
      if ((down && goNext()) || (up && goPrev())) e.preventDefault()
    }

    // 스크롤바를 끌거나 메뉴로 이동해 첫 화면 쪽으로 돌아오면 다시 보이게
    const onScroll = () => {
      if (busy.current) return
      // 첫 화면이 조금이라도 다시 보이면 페이드인
      setAway(window.scrollY >= last() - 4)
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
  }, [goNext, goPrev, last])

  return { away, goNext, cancel }
}
