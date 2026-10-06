/**
 * 0페이지 (맨 처음 화면): 경기대학교 축구부 블로그 배너를 통째로 보여줌 (사용자 요청 2026-10-07)
 * - 배너는 가로로 긴 그림이라 화면 가운데에 두고, 위아래 빈 곳은 같은 그림을 흑백으로 크게 흐려 채움
 *   (경계는 위아래로 부드럽게 사라지게)
 * - 휴대폰은 화면이 좁아 배너를 170%로 키워 가운데 "Keep GOING Up"이 읽히게 (양옆 글씨는 잘림)
 * - 아래 가운데 SCROLL 안내. 출처는 화면에 적지 않고 푸터 맨 아래에 링크로 (사용자 요청)
 * - 한 번 넘기면 KGU 로고 화면(히어로)으로 — use-hero-snap.ts
 */
import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const

export function IntroBanner({
  id,
  banner,
}: {
  id: string
  banner: { webp: string; jpg: string; alt: string }
}) {
  const reduce = useReducedMotion()
  return (
    <section id={id} aria-label="축구부 배너" className="relative h-screen min-h-[560px] w-full overflow-hidden bg-ink">
      {/* 위아래 빈 곳 채우기: 같은 배너를 흐리게 */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 bg-cover bg-center blur-[28px] grayscale brightness-75"
        style={{ backgroundImage: `url(${banner.jpg})` }}
      />
      <motion.picture
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0.4 : 1.4, ease: EASE }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <source type="image/webp" srcSet={banner.webp} />
        <img
          src={banner.jpg}
          alt={banner.alt}
          fetchPriority="high"
          decoding="async"
          className="h-auto w-[170%] max-w-none shrink-0 [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)] md:w-full"
        />
      </motion.picture>
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: reduce ? 0 : 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-num text-sm tracking-[0.3em] text-white/70"
      >
        SCROLL
      </motion.span>
    </section>
  )
}
