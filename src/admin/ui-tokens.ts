/** 관리자 화면 공통 모양·작은 도구 (컴포넌트가 아닌 것은 여기, 컴포넌트는 ui.tsx) */
import { cn } from '@/lib/utils'

export const input =
  'w-full rounded-xl border border-line bg-crest/70 px-3 py-2.5 text-base text-fg outline-none focus:border-fg/60 disabled:opacity-60'
export const label = 'flex flex-col gap-1.5 text-sm text-fg/60'
export const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40'
export const btnMain = cn(btn, 'bg-accent text-on-accent')
export const btnLine = cn(btn, 'border border-line bg-crest/60 text-fg hover:border-fg/40')
export const chip = (on: boolean) => cn(btn, on ? 'bg-fg text-crest' : 'border border-line bg-crest/60 text-fg hover:border-fg/40')

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

/** 지금 시각 (보관 시각 기록용) */
export const nowIso = () => new Date().toISOString()
