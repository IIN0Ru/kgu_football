/** 관리자 화면 공통 모양 (시안 승인 2026-10-14) */
import { AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

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

