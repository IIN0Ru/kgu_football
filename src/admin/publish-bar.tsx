/**
 * 맨 위 상태 줄: 'DB 에 저장'과 '사이트에 반영'은 다름을 보여 주고 반영을 요청함
 * 반영 요청 → Edge Function(request-publish) → GitHub publish.yml → 커밋 → deploy.yml → 사이트의 content-revision.json 이 DB 버전을 따라잡으면 '반영 완료'
 * 보통 2~4분. 10분이 지나도 안 바뀌면 '늦어짐'으로 알리고 개발자 확인 안내 (실패 알림은 개발자 GitHub 메일로 감)
 */
import { useCallback, useEffect, useState } from 'react'
import { CloudUpload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { friendlyError, isLocalTest, supabase } from './client'
import { btnMain, draft } from './ui-tokens'

type Phase = 'idle' | 'sending' | 'waiting' | 'done' | 'slow' | 'error'
const POLL_MS = 20_000
const SLOW_MS = 10 * 60_000

export function PublishBar({ dbRevision, siteRevision, refreshSite }: { dbRevision: number; siteRevision: number | null; refreshSite: () => Promise<number | null> }) {
  // 새로고침해도 '반영 중'을 이어서 보이도록 요청 시각·목표 버전을 세션에 남김
  const [wait, setWait] = useState<{ target: number; since: number; siteBefore: number | null } | null>(() => {
    try {
      return JSON.parse(draft.get('publish') || 'null')
    } catch {
      return null
    }
  })
  const [phase, setPhase] = useState<Phase>(wait ? 'waiting' : 'idle')
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const remember = (w: typeof wait) => {
    setWait(w)
    draft.set('publish', w ? JSON.stringify(w) : '')
  }

  const poll = useCallback(async () => {
    if (!wait) return
    const site = await refreshSite()
    setNow(Date.now())
    // 복구 뒤처럼 DB 버전이 사이트보다 작아진 경우엔 사이트 버전이 바뀐 것까지 확인
    const moved = wait.siteBefore === null || wait.siteBefore < wait.target || site !== wait.siteBefore
    if (site !== null && site >= wait.target && moved) {
      remember(null)
      setPhase('done')
    } else if (Date.now() - wait.since > SLOW_MS) setPhase('slow')
  }, [wait, refreshSite])

  useEffect(() => {
    if (!wait) return
    poll()
    const t = setInterval(poll, POLL_MS)
    return () => clearInterval(t)
  }, [wait, poll])

  async function publish() {
    setPhase('sending')
    setError('')
    try {
      if (isLocalTest) throw { message: '로컬 시험에서는 사이트 반영을 부르지 않아요' }
      const { data, error } = await supabase.functions.invoke('request-publish', { body: {} })
      if (error) {
        // 함수가 돌려준 한국어 오류 문장을 꺼냄
        let msg = ''
        try {
          msg = (await (error as { context?: Response }).context?.json())?.error ?? ''
        } catch {
          // 무시
        }
        throw { message: msg || error.message }
      }
      remember({ target: Math.max(dbRevision, Number(data?.revision) || 0), since: Date.now(), siteBefore: siteRevision })
      setPhase('waiting')
    } catch (e) {
      setError(friendlyError(e))
      setPhase('error')
    }
  }

  const behind = siteRevision === null || siteRevision !== dbRevision
  const minutes = wait ? Math.floor((now - wait.since) / 60_000) : 0

  let title: string
  let detail: string
  if (phase === 'waiting' || phase === 'sending') {
    title = phase === 'sending' ? '반영을 요청하는 중…' : '사이트에 반영하는 중이에요'
    detail = `보통 2~4분 걸려요${minutes ? ` · ${minutes}분 지남` : ''} · 이 창을 닫아도 반영은 계속돼요`
  } else if (phase === 'slow') {
    title = '반영이 늦어지고 있어요'
    detail = '10분이 지나도 사이트가 바뀌지 않았어요. 실패했을 수 있으니 개발자에게 알려 주세요 (개발자에게 실패 메일이 가요)'
  } else if (phase === 'error') {
    title = '반영을 요청하지 못했어요'
    detail = error
  } else if (behind) {
    title = '사이트에 아직 반영되지 않은 수정이 있어요'
    detail = `DB 저장 버전 ${dbRevision} · 지금 사이트 ${siteRevision ?? '확인 못 함'} — 저장만 해서는 사이트가 바뀌지 않아요`
  } else {
    title = phase === 'done' ? '사이트에 반영됐어요' : '사이트가 최신이에요'
    detail = `DB 저장 버전 ${dbRevision} · 사이트 ${siteRevision}${phase === 'done' ? ' — 방문자 화면은 새로고침하면 바뀌어요' : ''}`
  }
  const busy = phase === 'sending' || phase === 'waiting'
  const alert = behind || phase === 'error' || phase === 'slow'

  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-crest/60 p-4', alert ? 'border-accent/40' : 'border-line')}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-base font-medium">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <span className={cn('h-2 w-2 rounded-full', alert ? 'bg-accent' : 'bg-fg/40')} aria-hidden="true" />
          )}
          {title}
        </span>
        <span className="text-sm text-fg/60">{detail}</span>
      </div>
      <button className={btnMain} disabled={busy || (!behind && phase !== 'error' && phase !== 'slow')} onClick={publish}>
        <CloudUpload className="h-4 w-4" aria-hidden="true" />
        {phase === 'slow' || phase === 'error' ? '다시 반영' : '사이트에 반영'}
      </button>
    </div>
  )
}
