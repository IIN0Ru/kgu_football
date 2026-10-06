/**
 * 사이트 전체 뒤에 고정된 배경 사진.
 * - 첫 화면: 선명한 사진 + 아래쪽 어둡게 (KGU 글자 대비)
 * - 다음 화면(away): 흐린 사진이 서서히 겹쳐지고 전체가 어두워짐. 사진은 뒤에 흐릿하게 남음
 * 성능: 매 프레임 blur를 계산하지 않도록, 미리 흐리게 만든 사진 한 장을 겹쳐 투명도만 바꾼다.
 */
import { motion, useReducedMotion } from 'framer-motion'

// 화면 이동(use-hero-snap.ts)과 같은 곡선·시간: 천천히 시작해 천천히 끝나서
// 흐려질 때와 선명해질 때가 똑같은 속도로 보이고, 화면 이동과 함께 움직인다
const EASE = [0.65, 0, 0.35, 1] as const
const DURATION = 1.0

type Img = SiteBackgroundProps['image']

function Photo({ image, className, decorative }: { image: Img; className: string; decorative?: boolean }) {
  return (
    <picture>
      <source type="image/webp" srcSet={image.webpSrcSet} sizes="100vw" />
      <img
        src={image.src}
        srcSet={image.jpgSrcSet}
        sizes="100vw"
        alt={decorative ? '' : image.alt}
        aria-hidden={decorative || undefined}
        fetchPriority={decorative ? 'low' : 'high'}
        decoding="async"
        className={className}
      />
    </picture>
  )
}

interface SiteBackgroundProps {
  away: boolean
  image: {
    webpSrcSet: string
    jpgSrcSet: string
    src: string
    alt: string
  }
}

export function SiteBackground({ away, image }: SiteBackgroundProps) {
  const reduce = useReducedMotion()
  const t = { duration: reduce ? 0.3 : DURATION, ease: EASE }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {/* 선명한 사진 */}
      <Photo image={image} className="absolute inset-0 h-full w-full object-cover object-[50%_55%]" />

      {/* 미리 흐리게 만든 사진: 다음 화면에서 겹쳐짐 */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: away ? 1 : 0 }}
        transition={t}
      >
        <Photo
          image={image}
          decorative
          className="absolute inset-0 h-full w-full scale-125 object-cover object-[50%_55%] blur-[16px]"
        />
      </motion.div>

      {/* 노이즈 질감 */}
      <div className="noise-overlay absolute inset-0 opacity-[0.6] mix-blend-overlay" />

      {/* 첫 화면: 사진을 밝게 두고 글자 대비용으로 위·아래만 살짝 → 다음 화면: 밝은 막을 덮어 사진이 은은하게 남음 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/0 to-black/40"
        initial={false}
        animate={{ opacity: away ? 0 : 1 }}
        transition={t}
      />
      <motion.div className="absolute inset-0" initial={false} animate={{ opacity: away ? 1 : 0 }} transition={t}>
        <div className="absolute inset-0 bg-[var(--veil)] opacity-[var(--veil-opacity)]" />
      </motion.div>
    </div>
  )
}
