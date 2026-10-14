/** 글 탭: 블로그·매거진 글 추가·고치기·순서·보관/되살리기 (사진 없음: 제목·소개·원문 링크만) */
import { useEffect, useRef, useState } from 'react'
import { Archive, ArrowDown, ArrowUp, Check, ExternalLink, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { friendlyError, supabase } from './client'
import { updateVersioned, type AdminData, type Post } from './data'
import { FeedbackLine, type Feedback } from './ui'
import { btnLine, btnMain, chip, input, label, nowIso } from './ui-tokens'

type View = 'blog' | 'magazine' | 'archived'
const defaults = { blog: { source: '축구부 블로그' }, magazine: { source: '축구부 매거진' } }

interface Form {
  url: string
  title: string
  summary: string
  category: string
  date: string
}
const empty: Form = { url: '', title: '', summary: '', category: '인터뷰', date: '' }
const fromPost = (p: Post): Form => ({ url: p.url, title: p.title, summary: p.summary ?? '', category: p.category, date: p.published_on ?? '' })

/** 사이트에 보이는 순서와 같게: 날짜 최신순 → 순서 번호 → 먼저 넣은 것 */
const byOrder = (a: Post, b: Post) => (b.published_on ?? '').localeCompare(a.published_on ?? '') || a.position - b.position || a.id - b.id

export function PostsTab({ data, reload, onDirtyChange }: { data: AdminData; reload: () => Promise<void>; onDirtyChange: (dirty: boolean) => void }) {
  const [view, setView] = useState<View>('blog')
  const [editing, setEditing] = useState<Post | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const kind = view === 'archived' ? editing?.kind ?? 'blog' : view
  const [newKind, setNewKind] = useState<'blog' | 'magazine'>('blog')

  const list = data.posts.filter((p) => (view === 'archived' ? p.archived_at : !p.archived_at && p.kind === view)).sort(byOrder)
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

  // 저장하지 않은 글이 있는데 다른 글·분류를 누르면 먼저 물어봄 (리뷰 2-3)
  const dirty = JSON.stringify(form) !== JSON.stringify(editing ? fromPost(editing) : empty)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const guard = (fn: () => void) => (dirty ? setPendingAction(() => fn) : fn())
  const requestId = useRef<string | null>(null)

  function pickView(v: View) {
    setView(v)
    if (v !== 'archived') setNewKind(v)
    edit(null)
  }

  function edit(p: Post | null) {
    setEditing(p)
    setForm(p ? fromPost(p) : empty)
    setFeedback(null)
  }

  function check(): string | null {
    if (!/^https:\/\/\S+$/.test(form.url.trim())) return '원문 주소는 https:// 로 시작해야 해요'
    if (!form.title.trim()) return '제목을 적어 주세요'
    if (form.title.trim().length > 120) return '제목이 너무 길어요 (120자까지)'
    if (form.summary.length > 300) return '소개가 너무 길어요 (300자까지)'
    if (form.date && !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return '날짜를 2026-10-14 처럼 적어 주세요'
    return null
  }

  async function save() {
    const problem = check()
    if (problem) return setFeedback({ tone: 'error', text: problem })
    setBusy(true)
    setFeedback(null)
    const row = {
      url: form.url.trim(),
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      category: form.category.trim() || '인터뷰',
      published_on: form.date || null,
    }
    try {
      if (editing) {
        await updateVersioned('posts', editing.id, editing.version, row)
      } else {
        // 새 글은 같은 종류의 맨 앞 순서로
        const minPos = Math.min(0, ...data.posts.filter((p) => p.kind === newKind).map((p) => p.position))
        const { error } = await supabase.from('posts').insert({ ...row, kind: newKind, source: defaults[newKind].source, position: minPos - 1 })
        if (error) throw error
      }
      await reload()
      edit(null)
      setFeedback({ tone: 'ok', text: '저장했어요. 위의 ‘사이트에 반영’을 눌러야 사이트가 바뀌어요' })
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  async function toggleArchive(p: Post) {
    setBusy(true)
    try {
      await updateVersioned('posts', p.id, p.version, { archived_at: p.archived_at ? null : nowIso() })
      await reload()
      if (editing?.id === p.id) edit(null)
      setFeedback({ tone: 'ok', text: p.archived_at ? '되살렸어요' : '보관했어요 (‘보관함’에서 되살릴 수 있어요)' })
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  /** 순서 바꾸기: 화면 순서대로 순서 번호를 다시 매긴 뒤 두 글을 맞바꿈. 바뀐 글만 저장 */
  async function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const order = [...list]
    ;[order[i], order[j]] = [order[j], order[i]]
    setBusy(true)
    try {
      // 순서를 한 번에 저장 (0002 reorder_posts): 하나라도 다른 사람이 먼저 고쳤으면 전체 취소
      requestId.current ??= crypto.randomUUID()
      const { error } = await supabase.rpc('reorder_posts', {
        p_request_id: requestId.current,
        p_ids: order.map((p) => p.id),
        p_versions: order.map((p) => p.version),
      })
      if (error) {
        if (!/fetch|network/i.test(error.message)) requestId.current = null
        throw error
      }
      requestId.current = null
      await reload()
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) })
      await reload()
    } finally {
      setBusy(false)
    }
  }

  // 날짜가 있는 글은 날짜순이 우선이라, 같은 날짜끼리만 화살표 순서가 의미 있음
  const canMove = (i: number, dir: -1 | 1) => {
    const other = list[i + dir]
    return other !== undefined && (other.published_on ?? '') === (list[i].published_on ?? '')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-2 lg:col-span-7">
        {pendingAction && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/50 bg-crest/60 p-3 text-sm">
            <span className="flex-1">저장하지 않은 글 수정이 있어요.</span>
            <button className={btnLine} onClick={() => setPendingAction(null)}>
              계속 고치기
            </button>
            <button
              className={btnLine}
              onClick={() => {
                const fn = pendingAction
                setPendingAction(null)
                fn()
              }}
            >
              버리고 이동
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['blog', '블로그'],
              ['magazine', '매거진'],
              ['archived', '보관함'],
            ] as const
          ).map(([v, t]) => (
            <button key={v} className={chip(view === v)} aria-pressed={view === v} onClick={() => guard(() => pickView(v))}>
              {t}
            </button>
          ))}
          <span className="ml-auto text-sm text-fg/60">{view === 'archived' ? '사이트에 안 보이는 글' : '사이트에는 위에서 5개만 보여요 · 날짜 최신순'}</span>
        </div>
        {list.length === 0 && <p className="py-6 text-base text-fg/60">글이 없어요.</p>}
        <ul>
          {list.map((p, i) => (
            <li key={p.id} className={cn('flex items-center gap-3 border-t border-line py-3', editing?.id === p.id && 'rounded-xl border-transparent bg-crest/70 px-2')}>
              {view !== 'archived' && (
                <span className="flex flex-col">
                  <button aria-label={`${p.title} 위로`} className="tap-area text-fg/60 disabled:opacity-20" disabled={busy || !canMove(i, -1)} onClick={() => move(i, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button aria-label={`${p.title} 아래로`} className="tap-area text-fg/60 disabled:opacity-20" disabled={busy || !canMove(i, 1)} onClick={() => move(i, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </span>
              )}
              <button className="flex min-w-0 flex-1 flex-col text-left" onClick={() => guard(() => edit(p))}>
                <span className="truncate text-base">{p.title}</span>
                <span className="text-xs text-fg/60">
                  {p.kind === 'blog' ? '블로그' : '매거진'} · {p.category}
                  {p.published_on ? ` · ${p.published_on}` : ''}
                  {i < 5 && view !== 'archived' ? ' · 사이트에 보임' : ''}
                </span>
              </button>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="tap-area text-fg/60" aria-label={`${p.title} 원문 (새 창)`}>
                <ExternalLink className="h-4 w-4" />
              </a>
              <button className={btnLine} disabled={busy} onClick={() => toggleArchive(p)}>
                {p.archived_at ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                {p.archived_at ? '되살리기' : '보관'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="flex flex-col gap-4 rounded-2xl bg-crest/50 p-5 lg:col-span-5"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-medium">{editing ? '글 고치기' : '새 글 추가'}</span>
          {editing && (
            <button type="button" className={btnLine} onClick={() => guard(() => edit(null))}>
              <Plus className="h-4 w-4" aria-hidden="true" />새 글로
            </button>
          )}
        </div>
        {!editing && (
          <div className="flex gap-2">
            {(['blog', 'magazine'] as const).map((k) => (
              <button key={k} type="button" className={chip(newKind === k)} aria-pressed={newKind === k} onClick={() => setNewKind(k)}>
                {k === 'blog' ? '블로그 글' : '매거진'}
              </button>
            ))}
          </div>
        )}
        <label className={label}>
          원문 주소 (https 로 시작)
          <input className={input} inputMode="url" placeholder={kind === 'magazine' || newKind === 'magazine' ? 'https://online.fliphtml5.com/…' : 'https://blog.naver.com/orangeturtles/…'} value={form.url} onChange={(e) => set({ url: e.target.value })} />
        </label>
        <label className={label}>
          제목
          <input className={input} value={form.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className={label}>
          소개 한 문장 (없어도 됨)
          <textarea className={cn(input, 'h-20')} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            분류
            <input className={input} value={form.category} onChange={(e) => set({ category: e.target.value })} />
          </label>
          <label className={label}>
            날짜 (매거진은 비워도 됨)
            <input className={input} type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
        </div>
        <p className="text-xs text-fg/60">사진은 넣지 않아요. 제목·소개·원문 링크만.</p>
        <FeedbackLine value={feedback} />
        <button type="submit" className={btnMain} disabled={busy}>
          <Check className="h-4 w-4" aria-hidden="true" />
          {busy ? '저장 중…' : editing ? '저장' : '글 추가'}
        </button>
      </form>
    </div>
  )
}
