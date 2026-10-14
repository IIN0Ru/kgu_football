/** 선수 기록 탭: KUSF '경기대 선수기록' 표 붙여넣기 → 미리보기·검사 → save_match_result 로 한 번에 저장 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { friendlyError, supabase } from './client'
import { loadRecords, shortDate, type AdminData, type Match, type PlayerRecord } from './data'
import { parsePlayers } from './parse'
import { Badge, FeedbackLine, type Feedback } from './ui'
import { btnLine, btnMain, draft, input, label } from './ui-tokens'

const dash = (n: number) => (n ? n : '–')

type Saved = { matchId: number; rows: PlayerRecord[] } | { matchId: number; error: string } | null

/** 바깥: 경기 고르기·안내 문구. 안쪽 RecordsForm 은 경기(와 버전)가 바뀔 때 새로 만들어져 입력값이 그 경기 값으로 시작함 */
export function RecordsTab({
  data,
  reload,
  initialMatch,
  onDirtyChange,
}: {
  data: AdminData
  reload: () => Promise<void>
  initialMatch: number | null
  onDirtyChange: (dirty: boolean) => void
}) {
  const finished = data.matches.filter((m) => m.status === 'finished' && !m.archived_at)
  const defaultId = initialMatch ?? finished.find((m) => m.records_status === 'pending')?.id ?? finished[finished.length - 1]?.id ?? null
  const [matchId, setMatchId] = useState<number | null>(defaultId)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const match = finished.find((m) => m.id === matchId) ?? null

  if (finished.length === 0 || !match) return <p className="text-base text-fg/60">끝난 경기가 아직 없어요. ‘경기’ 탭에서 결과를 먼저 저장해 주세요.</p>
  return (
    <RecordsForm
      key={`${match.id}-${match.version}`}
      data={data}
      reload={reload}
      match={match}
      finished={finished}
      onPick={(id) => {
        setFeedback(null)
        setMatchId(id)
      }}
      feedback={feedback}
      setFeedback={setFeedback}
      onDirtyChange={onDirtyChange}
    />
  )
}

function RecordsForm({
  data,
  reload,
  match,
  finished,
  onPick,
  feedback,
  setFeedback,
  onDirtyChange,
}: {
  data: AdminData
  reload: () => Promise<void>
  match: Match
  finished: Match[]
  onPick: (id: number) => void
  feedback: Feedback
  setFeedback: (f: Feedback) => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const ours = data.teams.find((t) => t.is_ours)!
  const team = useMemo(() => new Map(data.teams.map((t) => [t.id, t.short_name])), [data.teams])
  const playerName = useMemo(() => new Map(data.players.map((p) => [p.id, p.name])), [data.players])
  const draftKey = `records:${match.id}`

  const [text, setText] = useState(() => draft.get(draftKey))
  const [savedState, setSavedState] = useState<Saved>(null)
  const [unattributed, setUnattributed] = useState(String(match.kgu_unattributed_goals))
  const [note, setNote] = useState(match.records_note ?? '')
  // 점수 정정: 선수 기록과 함께 한 번에 저장 (GPT 리뷰 2-2)
  const [homeScore, setHomeScore] = useState(String(match.home_score ?? ''))
  const [awayScore, setAwayScore] = useState(String(match.away_score ?? ''))
  const [dropBad, setDropBad] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const requestId = useRef<string | null>(null) // 연결이 끊겨 다시 누를 때 같은 요청으로 (두 번 저장 방지)

  // 저장된 선수 기록: 늦게 온 응답이 다른 경기 화면에 섞이지 않게 경기 번호를 같이 보관, 실패는 빈 목록과 구분 (리뷰 2-3)
  useEffect(() => {
    let alive = true
    loadRecords(match.id).then(
      (rows) => alive && setSavedState({ matchId: match.id, rows }),
      (e) => alive && setSavedState({ matchId: match.id, error: friendlyError(e) }),
    )
    return () => {
      alive = false
    }
  }, [match.id])
  const saved = savedState && savedState.matchId === match.id && 'rows' in savedState ? savedState.rows : null
  const savedError = savedState && savedState.matchId === match.id && 'error' in savedState ? savedState.error : null

  const scoreChanged = homeScore !== String(match.home_score ?? '') || awayScore !== String(match.away_score ?? '')
  const dirty = text.trim() !== '' || scoreChanged
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const parsed = useMemo(() => (text.trim() ? parsePlayers(text, ours.short_name) : null), [text, ours.short_name])
  const hs = /^\d{1,2}$/.test(homeScore) ? Number(homeScore) : NaN
  const as = /^\d{1,2}$/.test(awayScore) ? Number(awayScore) : NaN
  const kguScore = match.home_team_id === ours.id ? hs : as
  const extra = /^\d+$/.test(unattributed) ? Number(unattributed) : NaN
  const goalSum = parsed?.rows.reduce((s, r) => s + r.goals, 0) ?? 0
  const sumOk = !Number.isNaN(extra) && goalSum + extra === kguScore
  // 이름으로 기존 선수 찾기 (없으면 새 선수로 저장됨 → 오타를 알아보도록 표시)
  const byName = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of data.players) if (!m.has(p.name)) m.set(p.name, p.id)
    return m
  }, [data.players])

  const problems: string[] = []
  if (parsed && !parsed.headerFound) problems.push('표 머리줄(선수명·득점 …)을 찾지 못했어요. 표 제목 줄까지 같이 복사해 주세요')
  if (parsed?.headerFound && parsed.rows.length === 0) problems.push('선수 줄을 하나도 읽지 못했어요')
  if (parsed && parsed.errors.length > 0 && !dropBad) problems.push('읽지 못한 줄을 고치거나 ‘읽지 못한 줄 빼고 저장’을 골라 주세요')
  if (parsed?.headerFound && !sumOk) problems.push(`선수 득점 합 ${goalSum} + 기록에 없는 득점 ${Number.isNaN(extra) ? '?' : extra} ≠ 경기대 점수 ${kguScore}`)
  if (extra > 0 && !note.trim()) problems.push('기록에 없는 득점의 사유를 적어 주세요 (예: 상대 자책골로 보임)')
  if (Number.isNaN(hs) || Number.isNaN(as)) problems.push('점수를 숫자로 적어 주세요')
  if (parsed?.headerFound && saved === null) problems.push(savedError ? `저장된 기록을 불러오지 못했어요: ${savedError}` : '저장된 기록을 불러오는 중이에요')

  // 통째로 바꾸기 전 확인 (리뷰 2-4): 빠지는 선수·뺀 줄·없는 칸이 있으면 체크해야 저장
  const newIds = new Set(parsed?.rows.map((r) => byName.get(r.name)).filter(Boolean))
  const removed = (saved ?? []).filter((r) => !newIds.has(r.player_id)).map((r) => playerName.get(r.player_id) ?? '?')
  const cautions = [
    removed.length ? `지금 저장된 선수 중 ${removed.length}명이 빠져요: ${removed.join(', ')}` : null,
    dropBad && parsed?.errors.length ? `읽지 못한 ${parsed.errors.length}줄을 빼고 저장해요` : null,
    parsed?.missingColumns.length ? `표에 ${parsed.missingColumns.join('·')} 칸이 없어 모두 0으로 저장해요` : null,
    scoreChanged ? `점수를 ${match.home_score} : ${match.away_score} → ${homeScore} : ${awayScore} 로 고쳐요` : null,
  ].filter((x): x is string => Boolean(x))
  if (parsed?.headerFound && cautions.length > 0 && !confirmed) problems.push('아래 확인 사항을 읽고 체크해 주세요')

  // KUSF 에 이 경기 선수 기록이 끝내 안 나올 때: '기록 없음 + 사유' (공개 화면에서 '확인 중' 대신 사유를 보여 줌)
  const [missingNote, setMissingNote] = useState('')
  async function saveUnavailable() {
    if (!missingNote.trim()) return
    setBusy(true)
    setFeedback(null)
    try {
      const { error } = await supabase.rpc('save_match_result', {
        p_match_id: match.id,
        p_expected_version: match.version,
        p_request_id: crypto.randomUUID(),
        p_status: 'finished',
        p_home_score: match.home_score,
        p_away_score: match.away_score,
        p_kgu_unattributed_goals: 0,
        p_records_status: 'unavailable',
        p_records_note: missingNote.trim(),
        p_players: [],
      })
      if (error) throw error
      setMissingNote('')
      await reload()
      setFeedback({ tone: 'ok', text: '‘기록 없음’으로 저장했어요. 나중에 기록이 나오면 붙여 넣어 저장하면 돼요' })
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!parsed || problems.length) return
    setBusy(true)
    setFeedback(null)
    requestId.current ??= crypto.randomUUID()
    try {
      const players = parsed.rows.map((r) => ({
        ...(byName.has(r.name) ? { player_id: byName.get(r.name) } : { name: r.name }),
        shirt_number: r.number,
        goals: r.goals,
        assists: r.assists,
        yellow: r.yellow,
        red: r.red,
      }))
      const { data: res, error } = await supabase.rpc('save_match_result', {
        p_match_id: match.id,
        p_expected_version: match.version,
        p_request_id: requestId.current,
        p_status: 'finished',
        p_home_score: hs,
        p_away_score: as,
        p_kgu_unattributed_goals: extra,
        p_records_status: 'complete',
        p_records_note: extra > 0 ? note.trim() : null,
        p_players: players,
      })
      if (error) {
        if (!/fetch|network/i.test(error.message)) requestId.current = null // 확실히 거절된 요청은 새 번호로
        throw error
      }
      requestId.current = null
      draft.set(draftKey, '')
      setText('')
      onDirtyChange(false)
      await reload()
      setFeedback({
        tone: 'ok',
        text: res?.duplicate ? '이미 저장된 요청이에요' : `선수 ${players.length}명 기록을 저장했어요. 위의 ‘사이트에 반영’을 눌러야 사이트가 바뀌어요`,
      })
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className={label}>
          어느 경기의 기록인가요
          <select className={input} value={match.id} onChange={(e) => onPick(Number(e.target.value))}>
            {[...finished].reverse().map((m) => (
              <option key={m.id} value={m.id}>
                {shortDate(m.match_date)} {team.get(m.home_team_id)} {m.home_score} : {m.away_score} {team.get(m.away_team_id)}
                {m.records_status === 'pending' ? ' (기록 대기)' : ''}
              </option>
            ))}
          </select>
        </label>
        {savedError && <FeedbackLine value={{ tone: 'error', text: `저장된 기록을 불러오지 못했어요: ${savedError}` }} />}
        {saved && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-fg/60">
            지금 저장된 기록:
            {match.records_status === 'pending' ? (
              <Badge text="기록 대기" tone="todo" />
            ) : match.records_status === 'unavailable' ? (
              <span className="text-fg">기록 없음{match.records_note ? ` (${match.records_note})` : ''}</span>
            ) : (
              <span className="text-fg">
                선수 {saved.length}명 · 득점 {saved.reduce((s, r) => s + r.goals, 0)}
              </span>
            )}
            {saved.length > 0 && <span>— 새로 붙여 넣어 저장하면 이 경기의 선수 줄을 통째로 바꿔요</span>}
          </p>
        )}
        <label className={label}>
          KUSF ‘경기대 선수기록’ 표를 머리줄(선수명·득점 …)까지 통째로 복사해 붙여 넣기
          <textarea
            className={cn(input, 'h-64 font-mono text-sm')}
            value={text}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value)
              setDropBad(false)
              setConfirmed(false)
              draft.set(draftKey, e.target.value)
            }}
          />
        </label>
        <p className="text-xs text-fg/60">붙여 넣은 글은 저장에 실패하거나 새로고침해도 이 칸에 남아요 (이 창을 닫으면 지워져요).</p>
      </div>

      <div className="flex flex-col gap-4">
        {!parsed ? (
          <p className="text-base text-fg/60">붙여 넣으면 여기에 미리보기가 나와요.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-fg/60">미리보기 — 저장 전 확인</span>
              {parsed.headerFound && (
                <span className="text-base">
                  선수 {parsed.rows.length}명 · 득점 합 <b className="font-medium">{goalSum}</b>
                  {extra > 0 && <> + 기록에 없는 득점 {extra}</>} {sumOk ? '=' : '≠'} 경기대 점수 <b className="font-medium">{Number.isNaN(kguScore) ? '?' : kguScore}</b>
                  {sumOk && <Check className="ml-1 inline h-4 w-4" aria-label="맞음" />}
                </span>
              )}
              {parsed.missingColumns.length > 0 && (
                <span className="text-sm text-fg/60">표에 {parsed.missingColumns.join('·')} 칸이 없어 0으로 넣어요</span>
              )}
            </div>
            {parsed.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-fg/60">
                    <tr>
                      {['번호', '이름', '득점', '도움', '경고', '퇴장'].map((h) => (
                        <th key={h} className="border-b border-line py-2 pr-2 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((r) => (
                      <tr key={r.line} className="border-b border-line">
                        <td className="py-2 font-num">{r.number ?? '–'}</td>
                        <td>
                          {r.name}
                          {!byName.has(r.name) && <span className="ml-1.5 rounded-full border border-accent px-1.5 text-xs text-accent">새 선수</span>}
                        </td>
                        <td>{dash(r.goals)}</td>
                        <td>{dash(r.assists)}</td>
                        <td>{dash(r.yellow)}</td>
                        <td>{dash(r.red)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {parsed.rows.some((r) => !byName.has(r.name)) && (
              <p className="text-xs text-fg/60">‘새 선수’는 지금까지 기록에 없는 이름이에요. 오타가 아닌지 확인해 주세요.</p>
            )}
            {parsed.errors.map((e) => (
              <FeedbackLine
                key={`${e.line}-${e.reason}`}
                value={{ tone: 'warn', text: e.text ? `${e.line}번째 줄을 읽지 못했어요: “${e.text.replace(/\t/g, ' ').slice(0, 40)}” — ${e.reason}` : e.reason }}
              />
            ))}
            {parsed.skipped.length > 0 && <p className="text-xs text-fg/60">다른 학교 선수 {parsed.skipped.length}줄은 뺐어요.</p>}
          </>
        )}

        <div className="flex items-end gap-3">
          <label className={cn(label, 'flex-1')}>
            {team.get(match.home_team_id)} (홈) 점수
            <input className={cn(input, 'text-center font-num text-xl')} inputMode="numeric" value={homeScore} onChange={(e) => (setHomeScore(e.target.value), setConfirmed(false))} />
          </label>
          <span className="pb-2.5 font-num text-xl text-fg/30" aria-hidden="true">
            :
          </span>
          <label className={cn(label, 'flex-1')}>
            {team.get(match.away_team_id)} (원정) 점수
            <input className={cn(input, 'text-center font-num text-xl')} inputMode="numeric" value={awayScore} onChange={(e) => (setAwayScore(e.target.value), setConfirmed(false))} />
          </label>
        </div>
        <p className="-mt-2 text-xs text-fg/60">점수가 틀렸으면 여기서 고치면 선수 기록과 함께 한 번에 저장돼요.</p>

        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <label className={label}>
            기록에 없는 득점
            <input className={input} inputMode="numeric" value={unattributed} onChange={(e) => setUnattributed(e.target.value)} />
          </label>
          <label className={label}>
            사유 (상대 자책골 등)
            <input className={input} value={note} disabled={!(extra > 0)} placeholder="상대 자책골로 보임" onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>

        {parsed && problems.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {problems.map((p) => (
              <li key={p} className="text-fg">
                · {p}
              </li>
            ))}
          </ul>
        )}
        {parsed?.headerFound && cautions.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-accent/50 bg-crest/60 p-3 text-sm">
            <span className="font-medium">이 경기의 선수 기록을 통째로 바꾸기 전에 확인해 주세요</span>
            <ul className="flex flex-col gap-1">
              {cautions.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              확인했어요, 이대로 저장할게요
            </label>
          </div>
        )}
        <FeedbackLine value={feedback} />
        <div className="flex flex-wrap justify-end gap-2">
          {parsed && parsed.errors.length > 0 && (
            <button className={btnLine} aria-pressed={dropBad} onClick={() => (setDropBad((v) => !v), setConfirmed(false))}>
              {dropBad ? '✓ 읽지 못한 줄 빼고 저장' : '읽지 못한 줄 빼고 저장'}
            </button>
          )}
          <button className={btnMain} disabled={busy || !parsed || problems.length > 0} onClick={save}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>
        {!parsed && match.records_status !== 'unavailable' && (
          <details className="text-sm">
            <summary className="cursor-pointer text-fg/60">KUSF 에 이 경기 선수 기록이 끝내 안 나오나요?</summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-fg/60">
                ‘기록 없음’으로 저장하면 시즌 기록 페이지의 ‘확인 중’ 목록에서 빠져요. 저장된 선수 줄이 있으면 지워져요.
              </p>
              <label className={label}>
                사유
                <input className={input} value={missingNote} placeholder="예: KUSF 기록 미제공" onChange={(e) => setMissingNote(e.target.value)} />
              </label>
              <button className={cn(btnLine, 'self-end')} disabled={busy || !missingNote.trim()} onClick={saveUnavailable}>
                기록 없음으로 저장
              </button>
            </div>
          </details>
        )}
        {saved && saved.length > 0 && !parsed && (
          <details className="text-sm">
            <summary className="cursor-pointer text-fg/60">저장된 선수 기록 보기</summary>
            <ul className="mt-2">
              {saved.map((r) => (
                <li key={r.id} className="border-t border-line py-1.5">
                  <span className="font-num">{r.shirt_number ?? '–'}</span> {playerName.get(r.player_id)} · 득점 {dash(r.goals)} · 도움 {dash(r.assists)} · 경고{' '}
                  {dash(r.yellow)} · 퇴장 {dash(r.red)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}
