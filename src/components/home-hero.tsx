/**
 * 홈 첫 화면 (2026-10-14 직접 작성)
 *
 * 예전에는 21st.dev 의 PrismaHero 를 고쳐 썼지만, 원본의 라이선스가 'unknown' 이라 사용 허가를 확인할 수 없어
 * 원본 코드 없이 이 프로젝트에서 실제로 쓰는 부분만 새로 작성했다 (사용자 결정 "다시짜자", docs/SOURCES.md).
 *
 * 화면에 그리는 것
 * - 한 화면 높이의 빈 무대: 배경 사진은 site-background.tsx, 경기대 로고·각주 `*` 는 floating-logo.tsx 가 고정해서 그림
 *   → 여기에는 화면 읽기용 제목(h1)만 둔다
 * - 테두리만 있는 큰 'TURTLES' (축구부 별명): 데스크톱 오른쪽 아래, 휴대폰 오른쪽 위. 1.2초 동안 서서히 나타남
 * - SCROLL 안내: 글자 + 아래로 계속 흘러내리는 짧은 선. 데스크톱은 로고와 TURTLES 사이(화면 폭 40%), 휴대폰은 오른쪽 아래.
 *   1.4초 뒤 나타남
 * - '동작 줄이기' 설정: TURTLES 는 짧게, SCROLL 은 바로 나타나고 선은 흐르지 않음
 * 첫 화면 넘기기·로고 이동은 use-hero-snap.ts · floating-logo.tsx 가 맡는다
 */
import { motion, useReducedMotion } from 'framer-motion'

const EASE_PULL = [0.16, 1, 0.3, 1] as const

interface HomeHeroProps {
  id: string
  /** 화면 읽기 프로그램용 제목 (로고 그림의 대체 글) */
  title: string
  /** 테두리만 있는 큰 장식 글자 */
  outlineWord: string
}

export function HomeHero({ id, title, outlineWord }: HomeHeroProps) {
  const reduce = useReducedMotion()

  return (
    <section id={id} aria-label="소개" className="relative h-screen min-h-[560px] w-full">
      <h1 className="sr-only">{title}</h1>

      {/* 큰 장식 글자: 크림색 테두리만 (화면 읽기 프로그램에는 숨김) */}
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0.4 : 1.2, delay: 0.5, ease: EASE_PULL }}
        className="pointer-events-none absolute right-4 top-20 select-none font-num text-[24vw] leading-[0.8] tracking-[0.01em] text-transparent [-webkit-text-stroke:1.5px_rgb(225_224_204/0.95)] md:-bottom-[2vw] md:right-6 md:top-auto md:text-[17vw] md:[-webkit-text-stroke:2px_rgb(225_224_204/0.95)]"
      >
        {outlineWord}
      </motion.span>

      {/* SCROLL 안내 */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: reduce ? 0 : 1.4 }}
        className="pointer-events-none absolute bottom-6 right-5 z-10 flex flex-col items-center gap-3 [filter:drop-shadow(0_1px_6px_rgb(0_0_0/0.55))] md:bottom-10 md:left-[40vw] md:right-auto"
      >
        <span className="font-num text-base tracking-[0.3em] text-cream">SCROLL</span>
        <span className="relative h-14 w-0.5 overflow-hidden rounded-full bg-cream/35">
          <span
            className={`absolute inset-x-0 top-0 h-1/2 bg-cream ${reduce ? '' : 'animate-[scroll-drip_1.6s_cubic-bezier(0.65,0,0.35,1)_infinite]'}`}
          />
        </span>
      </motion.div>
    </section>
  )
}
