/**
 * 첫 화면의 경기대 로고 → 스크롤하면 줄어들며 위쪽 메뉴 탭 안의 로고 자리로 날아가 겹쳐지는 로고 (사용자 요청 2026-10-07, 시안 3번)
 * - 화면에 고정된 로고 하나를 스크롤 위치에 맞춰 옮기고 줄임: 맨 위에서는 첫 화면 왼쪽 아래(큰 크기),
 *   첫 화면 높이만큼 내려가면 메뉴 탭 안 로고 자리(`targetId`)와 같은 위치·크기. 도착할 즈음 사라지고 탭 안 로고가 그 자리를 이어받음
 * - 첫 화면 넘기기(1초 미끄러짐)와 같이 움직여서 양방향이 자연스러움
 * - 처음 열 때는 첫 화면 큰 글자와 같은 등장 연출(흐림 → 선명, 아래에서 올라옴)
 * - 첫 화면(사진 위)에서는 글자가 크림색인 판, 밝은 화면으로 올라가면서 원본(검은 글자) 판으로 서서히 바뀜
 * - 각주 `*`(비공식 사이트 안내)는 첫 화면에서만 보이고 올라가면서 사라짐
 * - 동작 줄이기 설정: 등장은 짧은 페이드만. 스크롤에 따른 이동은 스크롤 그 자체라 유지
 */
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'

const RATIO = 598 / 868 // 로고 세로 / 가로
const EASE = [0.16, 1, 0.3, 1] as const

interface Box {
  heroH: number
  x0: number
  y0: number
  w0: number
  x1: number
  y1: number
  w1: number
}

function measure(heroH: number): Box {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const md = vw >= 768
  const sm = vw >= 640
  // 첫 화면 위치·크기 (prisma-hero 의 여백과 같게)
  const w0 = md ? Math.min(vw * 0.3, vh * 0.34 * 1.45) : Math.min(vw * 0.58, vh * 0.32 * 1.45)
  const x0 = md ? 40 : sm ? 24 : 16
  const bottomGap = md ? 8 + 40 : 8 + 24
  const y0 = heroH - bottomGap - w0 * RATIO
  return { heroH, x0, y0, w0, x1: x0, y1: 8, w1: md ? 56 : 40 }
}

/** 메뉴 탭 안 로고 자리: 탭은 화면 가운데 위에 붙어 있으므로 transform(숨김 상태)과 상관없이 offset 값으로 계산 */
function slotBox(targetId: string): Pick<Box, 'x1' | 'y1' | 'w1'> | null {
  const slot = document.getElementById(targetId)
  const nav = slot?.closest('nav') as HTMLElement | null
  if (!slot || !nav) return null
  let left = 0
  let top = 0
  for (let el: HTMLElement | null = slot; el && el !== nav; el = el.offsetParent as HTMLElement | null) {
    left += el.offsetLeft
    top += el.offsetTop
  }
  const navLeft = (window.innerWidth - nav.offsetWidth) / 2
  return { x1: navLeft + left, y1: top, w1: slot.offsetWidth }
}

export function FloatingLogo({
  src,
  darkSrc,
  alt,
  heroId,
  asteriskHref,
  targetId,
}: {
  /** 사진 위(첫 화면)용: 글자 크림색 */
  src: string
  /** 밝은 화면(왼쪽 위)용: 원본 검은 글자 */
  darkSrc: string
  alt: string
  heroId: string
  asteriskHref?: string
  /** 도착할 자리 (메뉴 탭 안 로고 요소의 id) */
  targetId: string
}) {
  const reduce = useReducedMotion()
  const [box, setBox] = useState<Box | null>(null)

  useEffect(() => {
    const update = () => {
      const hero = document.getElementById(heroId)
      const m = measure(hero?.offsetHeight ?? window.innerHeight)
      setBox({ ...m, ...(slotBox(targetId) ?? {}) })
    }
    update()
    // 글꼴·로고가 늦게 그려지면 탭 폭이 바뀌므로 한 번 더
    const t = window.setTimeout(update, 600)
    document.fonts?.ready.then(update)
    window.addEventListener('resize', update)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', update)
    }
  }, [heroId, targetId])

  const { scrollY } = useScroll()
  const h = box?.heroH ?? 1
  const progress = useTransform(scrollY, [0, h], [0, 1], { clamp: true })
  const x = useTransform(progress, (p) => (box ? box.x0 + (box.x1 - box.x0) * p : 0))
  const y = useTransform(progress, (p) => (box ? box.y0 + (box.y1 - box.y0) * p : 0))
  const width = useTransform(progress, (p) => (box ? box.w0 + (box.w1 - box.w0) * p : 0))
  // 밝은 배경으로 갈수록 크림색 글자 → 원본 검은 글자로 바꿔 보여줌 (크림색은 밝은 배경에서 안 보임)
  const darkOpacity = useTransform(progress, [0.45, 0.9], [0, 1])
  // 도착 직전에 사라지고 탭 안 로고가 이어받음
  const wholeOpacity = useTransform(progress, [0.85, 0.99], [1, 0])
  const events = useTransform(progress, (p) => (p > 0.9 ? 'none' : 'auto'))
  const asteriskOpacity = useTransform(progress, [0, 0.35], [1, 0])
  const asteriskEvents = useTransform(progress, (p) => (p > 0.3 ? 'none' : 'auto'))
  const shadowOpacity = useTransform(progress, [0, 1], [0.35, 0])
  const filter = useTransform(shadowOpacity, (o) => `drop-shadow(0 2px 18px rgb(0 0 0 / ${o}))`)

  if (!box) return null

  return (
    <motion.div className="fixed left-0 top-0 z-[60]" style={{ x, y, width, opacity: wholeOpacity, pointerEvents: events }}>
      <motion.div
        initial={reduce ? { opacity: 0 } : { y: '30%', opacity: 0, filter: 'blur(12px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: reduce ? 0.4 : 1.2, delay: 0.1, ease: EASE }}
        className="relative"
      >
        <a
          href={`#${heroId}`}
          aria-label={`${alt} — 맨 위로`}
          className="block"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
          }}
        >
          <span className="relative block">
            <motion.img src={src} alt={alt} className="block h-auto w-full" style={{ filter }} />
            <motion.img
              src={darkSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 block h-auto w-full"
              style={{ opacity: darkOpacity }}
            />
          </span>
        </a>
        {asteriskHref && (
          <motion.a
            href={asteriskHref}
            aria-label="각주: 비공식 사이트 안내"
            style={{ opacity: asteriskOpacity, pointerEvents: asteriskEvents }}
            className="absolute -right-6 top-0 text-3xl font-medium text-cream md:-right-8 md:text-5xl"
          >
            *
          </motion.a>
        )}
      </motion.div>
    </motion.div>
  )
}
