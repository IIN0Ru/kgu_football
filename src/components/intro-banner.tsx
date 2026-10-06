/**
 * 0페이지 (맨 처음 화면): 경기대학교 축구부 블로그 배너를 통째로 보여줌 (사용자 요청 2026-10-07)
 * - 배너는 가로로 긴 그림이라 화면 가운데에 두고, 위아래 빈 곳은 같은 그림을 흑백으로 크게 흐려 채움
 *   (경계는 위아래로 부드럽게 사라지게)
 * - 휴대폰은 화면이 좁아 배너를 170%로 키워 가운데 "Keep GOING Up"이 읽히게 (양옆 글씨는 잘림)
 * - 아래 가운데 SCROLL 안내. 출처는 화면에 적지 않고 푸터 맨 아래에 링크로 (사용자 요청)
 * - 한 번 넘기면 KGU 로고 화면(히어로)으로 — use-hero-snap.ts
 *
 * 움직임 (사용자가 후보 8개 중 1·4·7·8 선택, 2026-10-07)
 * 1. 질주 등장: 배너가 왼쪽에서 가로로 흐린 잔상으로 들어와 0.9초 만에 선명하게 멈춤 (흐린 판은 미리 만든 그림)
 * 4. 필름 질감: 거친 질감이 필름처럼 계속 미세하게 움직임
 * 7. SCROLL 아래 짧은 선이 계속 흘러내림
 * 8. 뚫고 지나가기: 넘기는 동안 배너 화면은 제자리에 붙어 있고(밀려 올라가지 않음 → 두 화면 경계선이 안 보임)
 *    커지고 흐려지며 사라짐 → 그 자리로 뒤의 캠퍼스 사진이 드러남 (2026-10-07 사용자 "두 화면 경계가 보임" → 수정)
 * - 동작 줄이기 설정: 짧은 페이드만 (흐림·이동·확대·질감 움직임 없음)
 */
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { useRef, useState } from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

export function IntroBanner({
  id,
  banner,
}: {
  id: string
  banner: { webp: string; jpg: string; streak: string; alt: string }
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  // 배너 그림이 다 받아진 뒤에 등장을 시작 (느린 회선에서 빈 화면 동안 등장이 끝나버리지 않게)
  const [loaded, setLoaded] = useState(false)

  // 1. 질주 등장: 미리 가로로 흐리게 만든 배너(kgu-banner-streak)를 겹쳐 함께 들어오다가 사라짐
  //    (매 프레임 흐림을 계산하지 않고 위치·투명도만 바꿔 휴대폰에서도 부드럽게)
  // 8. 뚫고 지나가기: 0페이지를 지나가는 정도(0 → 1). 화면 층은 제자리에 붙어 있고,
  //    커지고 흐려지며 투명해짐. 스크롤을 따라 위치를 되돌리는 방식은 한 프레임씩 늦어 경계가 보여서,
  //    화면 층 자체를 화면에 고정(fixed)하고 투명도·크기만 바꿈. 0페이지 구역은 스크롤 길이만 차지
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  // 다 사라지면 아예 숨겨 아래 화면을 가리거나 클릭을 막지 않게
  const gone = useTransform(scrollYProgress, (p) => (p >= 0.99 ? 'hidden' : 'visible'))
  const fade = useTransform(scrollYProgress, [0, 0.15, 0.85], [1, 1, 0])
  const hintFade = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.35])
  const blur = useTransform(scrollYProgress, (p) => (reduce ? 'none' : `blur(${p * 14}px)`))

  return (
    <section
      ref={ref}
      id={id}
      aria-label="축구부 배너"
      className="relative z-10 h-screen min-h-[560px] w-full"
    >
      {/* 화면 층: 화면에 고정된 채 투명해짐 → 경계선이 생기지 않음 */}
      <motion.div
        className="fixed inset-0 overflow-hidden bg-ink"
        style={{ opacity: fade, visibility: gone }}
      >
      <motion.div className="absolute inset-0" style={{ scale, filter: blur }}>
        {/* 위아래 빈 곳 채우기: 같은 배너를 흐리게 */}
        <div
          aria-hidden="true"
          className="absolute -inset-10 bg-cover bg-center blur-[28px] grayscale brightness-75"
          style={{ backgroundImage: `url(${banner.jpg})` }}
        />
        <motion.picture
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: '-14%' }}
          animate={loaded ? { opacity: 1, x: '0%' } : undefined}
          transition={{
            duration: reduce ? 0.4 : 0.9,
            delay: reduce ? 0 : 0.1,
            ease: EASE,
            opacity: { duration: reduce ? 0.4 : 0.5, delay: reduce ? 0 : 0.35 },
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <source type="image/webp" srcSet={banner.webp} />
          <img
            src={banner.jpg}
            alt={banner.alt}
            fetchPriority="high"
            decoding="async"
            ref={(el) => {
              if (el?.complete) setLoaded(true)
            }}
            onLoad={() => setLoaded(true)}
            className="h-auto w-[170%] max-w-none shrink-0 [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)] md:w-full"
          />
        </motion.picture>
        {!reduce && (
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, x: '-14%' }}
            animate={loaded ? { opacity: [1, 1, 0], x: '0%' } : undefined}
            transition={{ duration: 0.9, delay: 0.1, ease: EASE, opacity: { duration: 0.9, delay: 0.1, times: [0, 0.35, 1] } }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <img
              src={banner.streak}
              alt=""
              className="h-auto w-[170%] max-w-none shrink-0 scale-x-110 [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)] md:w-full"
            />
          </motion.div>
        )}
      </motion.div>

      {/* 4. 필름 질감: 노이즈를 조금씩 옮겨 계속 살아 움직이게 */}
      <div
        aria-hidden="true"
        className={`noise-overlay pointer-events-none absolute -inset-[20%] opacity-[0.55] mix-blend-overlay ${
          reduce ? '' : 'animate-[film-grain_0.8s_steps(6)_infinite]'
        }`}
      />

      {/* 7. SCROLL + 흘러내리는 선 (넘기기 시작하면 바로 사라짐) */}
      <motion.div aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ opacity: hintFade }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : undefined}
        transition={{ duration: 0.8, delay: reduce ? 0 : 1.1 }}
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
      >
        <span className="font-num text-sm tracking-[0.3em] text-cream/80">SCROLL</span>
        <span className="relative h-10 w-px overflow-hidden bg-cream/20">
          <span
            className={`absolute inset-x-0 top-0 h-1/2 bg-cream ${
              reduce ? '' : 'animate-[scroll-drip_1.6s_cubic-bezier(0.65,0,0.35,1)_infinite]'
            }`}
          />
        </span>
      </motion.div>
      </motion.div>
      </motion.div>
    </section>
  )
}
