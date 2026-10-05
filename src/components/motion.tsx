/**
 * 사이트 공통 움직임 부품 (impeccable `animate` 지침 기준으로 작성)
 * - Reveal: 카드가 아래 가장자리에서 위로 열리며 등장 (clip-path)
 * - RollingNumber: 점수 숫자가 전광판처럼 굴러 올라감
 * '동작 줄이기' 설정이면 위치 이동 없이 투명도만 바뀐다.
 */
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1] as const

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  id?: string
  delay?: number
}

/**
 * 바깥 <section>은 잘리지 않은 채로 화면 진입을 감지하고, 안쪽 카드만 clip-path로 연다.
 * (clip-path로 완전히 가려진 요소는 브라우저가 '화면에 안 보임'으로 판단해 감지가 안 되기 때문)
 */
export function Reveal({ children, className, delay = 0, id, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const reduce = useReducedMotion()
  const hidden = reduce ? { opacity: 0 } : { clipPath: 'inset(100% 0% 0% 0% round 32px)' }
  const shown = reduce ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0% round 32px)' }

  return (
    <section ref={ref} id={id} className="scroll-mt-16" {...rest}>
      <motion.div
        initial={hidden}
        animate={inView ? shown : hidden}
        transition={{ duration: reduce ? 0.3 : 0.8, delay, ease: EASE }}
        className={cn('h-full', className)}
      >
        {children}
      </motion.div>
    </section>
  )
}

interface RollingNumberProps {
  value: number
  className?: string
  delay?: number
}

/** 0부터 value까지 숫자 띠가 위로 굴러가 멈춤. 화면에 보일 때 한 번만. */
export function RollingNumber({ value, className, delay = 0 }: RollingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const digits = Array.from({ length: value + 1 }, (_, i) => i)

  if (reduce) {
    return <span className={className}>{value}</span>
  }

  return (
    <span
      ref={ref}
      className={cn('relative inline-block overflow-hidden align-bottom', className)}
      style={{ height: '1em' }}
      aria-label={String(value)}
    >
      <motion.span
        aria-hidden="true"
        className="flex flex-col"
        initial={{ y: '0em' }}
        animate={inView ? { y: `-${value}em` } : {}}
        transition={{ duration: 0.9 + value * 0.12, delay, ease: EASE }}
      >
        {digits.map((d) => (
          <span key={d} className="block h-[1em] leading-none">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  )
}
