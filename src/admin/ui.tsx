/** 관리자 화면 공통 모양 (시안 승인 2026-10-14) */
import { AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const input =
  'w-full rounded-xl border border-line bg-crest/70 px-3 py-2.5 text-base text-fg outline-none focus:border-fg/60 disabled:opacity-60'
export const label = 'flex flex-col gap-1.5 text-sm text-fg/60'
export const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40'
export const btnMain = cn(btn, 'bg-accent text-on-accent')
export const btnLine = cn(btn, 'border border-line bg-crest/60 text-fg hover:border-fg/40')
export const chip = (on: boolean) => cn(btn, on ? 'bg-fg text-crest' : 'border border-line bg-crest/60 text-fg hover:border-fg/40')

export type Feedback = { tone: 'ok' | 'error' | 'warn'; text: string } | null

/** 저장 결과·오류 한 줄. 화면 읽기 프로그램이 바로 읽도록 role=status/alert */
export function FeedbackLine({ value }: { value: Feedback }) {
  if (!value) return null
  const Icon = value.tone === 'ok' ? Check : AlertTriangle
  return (
    <p
      role={value.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-xl p-3 text-sm',
        value.tone === 'ok' ? 'bg-crest/60 text-fg' : 'border border-accent/50 bg-crest/60 text-fg',
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', value.tone === 'ok' ? 'text-fg' : 'text-accent')} aria-hidden="true" />
      <span>{value.text}</span>
    </p>
  )
}

export function Badge({ text, tone }: { text: string; tone: 'done' | 'todo' | 'plain' }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-0.5 text-xs',
        tone === 'done' && 'bg-fg text-crest',
        tone === 'todo' && 'border border-accent text-accent',
        tone === 'plain' && 'border border-line text-fg/60',
      )}
    >
      {text}
    </span>
  )
}

/** 세션 동안만 남는 임시 저장 (붙여 넣은 글이 저장 실패·새로고침에도 남게). 못 쓰는 환경이면 조용히 넘어감 */
export const draft = {
  get(key: string) {
    try {
      return sessionStorage.getItem(`kgu-admin:${key}`) ?? ''
    } catch {
      return ''
    }
  },
  set(key: string, v: string) {
    try {
      if (v) sessionStorage.setItem(`kgu-admin:${key}`, v)
      else sessionStorage.removeItem(`kgu-admin:${key}`)
    } catch {
      // 무시
    }
  },
}

/** '' → null, 숫자 문자열 → 숫자 */
export const intOrNull = (s: string) => (s.trim() === '' ? null : /^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN)
