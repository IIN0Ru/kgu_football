/** 경기 탭: 일정·상태·점수 고치기, 경기 추가, 보관/되살리기 */
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Archive, Check, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { friendlyError, supabase } from './client'
import { dateLabel, loadRecords, matchBadge, shortDate, statusLabel, updateVersioned, type AdminData, type Match, type MatchStatus } from './data'
import { Badge, btnLine, btnMain, chip, FeedbackLine, input, intOrNull, label, type Feedback } from './ui'

interface Form {
  status: MatchStatus
  home: string
  away: string
  date: string
  kickoff: string
  venue: string
  homeTeam: string // 새 경기: 팀 id 또는 'new'
  awayTeam: string
  newHome: string
  newAway: string
}

const blank = (ourId: number): Form => ({
  status: 'scheduled',
  home: '',
  away: '',
  date: '',
  kickoff: '',
  venue: '',
  homeTeam: String(ourId),
  awayTeam: '',
  newHome: '',
  newAway: '',
})

const fromMatch = (m: Match): Form => ({
  status: m.status,
  home: m.home_score?.toString() ?? '',
  away: m.away_score?.toString() ?? '',
  date: m.match_date,
  kickoff: m.kickoff ?? '',
  venue: m.venue ?? '',
  homeTeam: String(m.home_team_id),
  awayTeam: String(m.away_team_id),
  newHome: '',
  newAway: '',
})

export function MatchesTab({ data, reload, onGoRecords }: { data: AdminData; reload: () => Promise<void>; onGoRecords: (id: number) => void }) {
  const ours = data.teams.find((t) => t.is_ours)!
  const team = useMemo(() => new Map(data.teams.map((t) => [t.id, t.short_name])), [data.teams])
  const [showArchived, setShowArchived] = useState(false)
  const list = data.matches.filter((m) => showArchived || !m.archived_at)
  // 처음엔 '할 일'(결과 입력·기록 대기)이 있는 가장 이른 경기, 없으면 다음 경기
  const firstTodo = list.find((m) => matchBadge(m).tone === 'todo') ?? list.find((m) => m.status === 'scheduled') ?? list[list.length - 1]
  const [selected, setSelected] = useState<number | 'new' | null>(firstTodo?.id ?? null)
  const match = typeof selected === 'number' ? data.matches.find((m) => m.id === selected) ?? null : null
  const [form, setForm] = useState<Form>(() => (match ? fromMatch(match) : blank(ours.id)))
  const [pending, setPending] = useState<number | 'new' | null>(null) // 저장 안 한 채 다른 경기를 누름
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const original = match ? fromMatch(match) : blank(ours.id)
  const dirty = JSON.stringify(form) !== JSON.stringify(original)

  // 다시 불러온 뒤 선택한 경기의 새 값으로 맞춤
  useEffect(() => {
    if (match) setForm(fromMatch(match))
  }, [match?.version])

  function select(id: number | 'new') {
    if (dirty && id !== selected) {
      setPending(id)
      return
    }
    open(id)
  }
  function open(id: number | 'new') {
    setPending(null)
    setFeedback(null)
    setSelected(id)
    const m = typeof id === 'number' ? data.matches.find((x) => x.id === id) : null
    setForm(m ? fromMatch(m) : blank(ours.id))
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const isNew = selected === 'new'
  const homeName = isNew ? (form.homeTeam === 'new' ? form.newHome || '홈' : team.get(Number(form.homeTeam)) ?? '홈') : team.get(match?.home_team_id ?? 0)
  const awayName = isNew ? (form.awayTeam === 'new' ? form.newAway || '원정' : team.get(Number(form.awayTeam)) ?? '원정') : team.get(match?.away_team_id ?? 0)

  function check(): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return '날짜를 2026-10-30 처럼 적어 주세요'
    if (form.kickoff && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.kickoff)) return '시각을 15:00 처럼 적어 주세요 (모르면 비워 두기)'
    if (form.status === 'finished') {
      const h = intOrNull(form.home)
      const a = intOrNull(form.away)
      if (h === null || a === null || Number.isNaN(h) || Number.isNaN(a) || h > 99 || a > 99) return '끝난 경기는 두 팀 점수를 숫자로 적어 주세요'
    }
    if (isNew) {
      if (!form.awayTeam && !form.newAway) return '원정 팀을 골라 주세요'
      if (form.homeTeam === 'new' && !form.newHome.trim()) return '새 학교 이름을 적어 주세요'
      if (form.awayTeam === 'new' && !form.newAway.trim()) return '새 학교 이름을 적어 주세요'
      if (form.homeTeam === form.awayTeam && form.homeTeam !== 'new') return '홈과 원정이 같은 팀이에요'
    }
    return null
  }

  async function teamId(choice: string, newName: string) {
    if (choice !== 'new') return Number(choice)
    const name = newName.trim()
    const found = data.teams.find((t) => t.short_name === name)
    if (found) return found.id
    const { data: row, error } = await supabase.from('teams').insert({ short_name: name }).select('id').single()
    if (error) throw error
    return row.id as number
  }

  async function save() {
    const problem = check()
    if (problem) return setFeedback({ tone: 'error', text: problem })
    setBusy(true)
    setFeedback(null)
    try {
      const finished = form.status === 'finished'
      const scores = { home_score: finished ? Number(form.home) : null, away_score: finished ? Number(form.away) : null }
      const common = { match_date: form.date, kickoff: form.kickoff || null, venue: form.venue.trim() || null, status: form.status, ...scores }
      if (isNew) {
        const latest = data.matches[data.matches.length - 1]
        const { data: row, error } = await supabase
          .from('matches')
          .insert({
            ...common,
            season: Number(form.date.slice(0, 4)),
            competition: latest?.competition ?? 'KUSF 대학축구 U리그 4권역',
            home_team_id: await teamId(form.homeTeam, form.newHome),
            away_team_id: await teamId(form.awayTeam, form.newAway),
          })
          .select('id')
          .single()
        if (error) throw error
        await reload()
        setSelected(row.id as number)
        setFeedback({ tone: 'ok', text: '경기를 추가했어요. 위의 ‘사이트에 반영’을 눌러야 사이트에 보여요' })
      } else if (match) {
        // 선수 기록이 이미 저장된 경기: 점수를 바꾸면 선수 득점 합과 어긋나지 않는지 먼저 확인
        if (match.records_status === 'complete') {
          if (!finished) {
            throw { message: '선수 기록이 저장된 경기는 ‘끝남’에서 다른 상태로 바꿀 수 없어요. 개발자에게 알려 주세요' }
          }
          const kgu = match.home_team_id === ours.id ? scores.home_score : scores.away_score
          const before = match.home_team_id === ours.id ? match.home_score : match.away_score
          if (kgu !== before) {
            const recs = await loadRecords(match.id)
            const sum = recs.reduce((s, r) => s + r.goals, 0) + match.kgu_unattributed_goals
            if (sum !== kgu) {
              throw { message: `저장된 선수 득점 합이 ${sum}골이라 경기대 점수를 ${kgu}(으)로 바꿀 수 없어요. ‘선수 기록’ 탭에서 기록을 다시 붙여 넣으면서 고쳐 주세요` }
            }
          }
        }
        await updateVersioned('matches', match.id, match.version, common)
        await reload()
        setFeedback({
          tone: 'ok',
          text:
            finished && match.records_status === 'pending'
              ? '저장했어요. KUSF 선수 기록이 올라오면 ‘선수 기록’ 탭에서 붙여 넣어 주세요'
              : '저장했어요. 위의 ‘사이트에 반영’을 눌러야 사이트가 바뀌어요',
        })
      }
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  async function toggleArchive() {
    if (!match) return
    setBusy(true)
    try {
      await updateVersioned('matches', match.id, match.version, { archived_at: match.archived_at ? null : new Date().toISOString() })
      await reload()
      setFeedback({ tone: 'ok', text: match.archived_at ? '되살렸어요' : '보관했어요. 사이트에 반영하면 사이트에서 사라져요 (‘보관된 경기 보기’에서 되살릴 수 있어요)' })
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  const teamOptions = data.teams.map((t) => (
    <option key={t.id} value={t.id}>
      {t.short_name}
    </option>
  ))

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-2 lg:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-fg/60">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            보관된 경기 보기
          </label>
          <button className={btnLine} onClick={() => select('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            경기 추가
          </button>
        </div>
        {pending !== null && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/50 bg-crest/60 p-3 text-sm">
            <span className="flex-1">저장하지 않은 수정이 있어요.</span>
            <button className={btnLine} onClick={() => setPending(null)}>
              계속 고치기
            </button>
            <button className={btnLine} onClick={() => open(pending)}>
              버리고 이동
            </button>
          </div>
        )}
        <ul className="flex flex-col" aria-label="경기 목록">
          {list.map((m) => {
            const b = matchBadge(m)
            const on = m.id === selected
            return (
              <li key={m.id}>
                <button
                  onClick={() => select(m.id)}
                  aria-current={on ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border-t border-line px-2 py-3 text-left',
                    on ? 'border-transparent bg-crest/70' : 'hover:bg-crest/40',
                    m.archived_at && 'opacity-60',
                  )}
                >
                  <span className="w-20 shrink-0 text-sm text-fg/60">{shortDate(m.match_date)}</span>
                  <span className="min-w-0 flex-1 text-base">
                    {team.get(m.home_team_id)}{' '}
                    <span className="font-num text-fg/60">
                      {m.status === 'finished' ? `${m.home_score} : ${m.away_score}` : m.kickoff ?? 'vs'}
                    </span>{' '}
                    {team.get(m.away_team_id)}
                  </span>
                  <Badge {...b} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {selected !== null && (
        <form
          className="flex flex-col gap-5 rounded-2xl bg-crest/50 p-5 lg:col-span-7"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm text-fg/60">
              {isNew ? '새 경기' : `${dateLabel(match!.match_date)}${match!.kickoff ? ` ${match!.kickoff}` : ''}${match!.venue ? ` · ${match!.venue}` : ''}`}
            </span>
            <span className="text-xl font-medium">
              {homeName} vs {awayName}
            </span>
          </div>

          {isNew && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>
                홈 팀
                <select className={input} value={form.homeTeam} onChange={(e) => set({ homeTeam: e.target.value })}>
                  {teamOptions}
                  <option value="new">목록에 없는 학교…</option>
                </select>
                {form.homeTeam === 'new' && <input className={input} placeholder="예: 아주대" value={form.newHome} onChange={(e) => set({ newHome: e.target.value })} />}
              </label>
              <label className={label}>
                원정 팀
                <select className={input} value={form.awayTeam} onChange={(e) => set({ awayTeam: e.target.value })}>
                  <option value="">고르기</option>
                  {teamOptions}
                  <option value="new">목록에 없는 학교…</option>
                </select>
                {form.awayTeam === 'new' && <input className={input} placeholder="예: 아주대" value={form.newAway} onChange={(e) => set({ newAway: e.target.value })} />}
              </label>
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-fg/60">상태</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(statusLabel) as MatchStatus[]).map((s) => (
                <button key={s} type="button" aria-pressed={form.status === s} className={chip(form.status === s)} onClick={() => set({ status: s })}>
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </fieldset>

          {form.status === 'finished' && (
            <div className="flex items-end gap-3">
              <label className={cn(label, 'flex-1')}>
                {homeName} (홈)
                <input className={cn(input, 'text-center font-num text-3xl')} inputMode="numeric" value={form.home} onChange={(e) => set({ home: e.target.value })} />
              </label>
              <span className="pb-3 font-num text-3xl text-fg/30" aria-hidden="true">
                :
              </span>
              <label className={cn(label, 'flex-1')}>
                {awayName} (원정)
                <input className={cn(input, 'text-center font-num text-3xl')} inputMode="numeric" value={form.away} onChange={(e) => set({ away: e.target.value })} />
              </label>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              날짜
              <input className={input} type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
            </label>
            <label className={label}>
              시각 (모르면 비워 두기 → ‘시간 확인 중’)
              <input className={input} placeholder="15:00" inputMode="numeric" value={form.kickoff} onChange={(e) => set({ kickoff: e.target.value })} />
            </label>
            <label className={cn(label, 'sm:col-span-2')}>
              장소
              <input className={input} value={form.venue} onChange={(e) => set({ venue: e.target.value })} />
            </label>
          </div>

          {match?.status === 'finished' && match.records_status === 'pending' && (
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-fg/60">
              <AlertTriangle className="h-4 w-4 text-accent" aria-hidden="true" />
              선수 기록이 아직 없어요 — KUSF 기록이 올라오면
              <button type="button" className="tap-area text-fg underline underline-offset-4" onClick={() => onGoRecords(match.id)}>
                ‘선수 기록’ 탭에서 붙여 넣기
              </button>
            </p>
          )}

          <FeedbackLine value={feedback} />

          <div className="flex flex-wrap justify-end gap-2">
            {match && (
              <button type="button" className={btnLine} disabled={busy} onClick={toggleArchive}>
                {match.archived_at ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                {match.archived_at ? '되살리기' : '보관 (숨기기)'}
              </button>
            )}
            <button type="submit" className={btnMain} disabled={busy || (!dirty && !isNew)}>
              <Check className="h-4 w-4" aria-hidden="true" />
              {busy ? '저장 중…' : isNew ? '경기 추가' : '저장'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
