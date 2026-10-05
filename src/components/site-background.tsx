/**
 * 사이트 전체 뒤에 고정된 배경 사진.
 * - 첫 화면: 선명한 사진 + 아래쪽 어둡게 (KGU 글자 대비)
 * - 다음 화면(away): 흐린 사진이 서서히 겹쳐지고 전체가 어두워짐. 사진은 뒤에 흐릿하게 남음
 * 성능: 매 프레임 blur를 계산하지 않도록, 미리 흐리게 만든 사진 한 장을 겹쳐 투명도만 바꾼다.
 */
import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const

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
  const t = { duration: reduce ? 0.3 : 1.1, ease: EASE }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
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

      {/* 첫 화면: 위 살짝, 아래 진하게 → 다음 화면: 전체를 고르게 어둡게 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/85"
        initial={false}
        animate={{ opacity: away ? 0 : 1 }}
        transition={t}
      />
      <motion.div
        className="absolute inset-0 bg-black"
        initial={false}
        animate={{ opacity: away ? 0.6 : 0 }}
        transition={t}
      />
    </div>
  )
}
