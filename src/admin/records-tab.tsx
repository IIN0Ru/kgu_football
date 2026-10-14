/** 선수 기록 탭: KUSF '경기대 선수기록' 표 붙여넣기 → 미리보기·검사 → save_match_result 로 한 번에 저장 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { friendlyError, supabase } from './client'
import { loadRecords, shortDate, type AdminData, type PlayerRecord } from './data'
import { parsePlayers } from './parse'
import { Badge, btnLine, btnMain, draft, FeedbackLine, input, label, type Feedback } from './ui'

const dash = (n: number) => (n ? n : '–')

export function RecordsTab({ data, reload, initialMatch }: { data: AdminData; reload: () => Promise<void>; initialMatch: number | null }) {
  const ours = data.teams.find((t) => t.is_ours)!
  const team = useMemo(() => new Map(data.teams.map((t) => [t.id, t.short_name])), [data.teams])
  const playerName = useMemo(() => new Map(data.players.map((p) => [p.id, p.name])), [data.players])
  const finished = data.matches.filter((m) => m.status === 'finished' && !m.archived_at)
  const defaultId = initialMatch ?? finished.find((m) => m.records_status === 'pending')?.id ?? finished[finished.length - 1]?.id ?? null
  const [matchId, setMatchId] = useState<number | null>(defaultId)
  const match = finished.find((m) => m.id === matchId) ?? null

  const [text, setText] = useState(() => (matchId ? draft.get(`records:${matchId}`) : ''))
  const [saved, setSaved] = useState<PlayerRecord[] | null>(null)
  const [unattributed, setUnattributed] = useState('0')
  const [note, setNote] = useState('')
  const [dropBad, setDropBad] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const requestId = useRef<string | null>(null) // 연결이 끊겨 다시 누를 때 같은 요청으로 (두 번 저장 방지)

  useEffect(() => {
    if (!match) return
    setSaved(null)
    loadRecords(match.id).then(setSaved, () => setSaved([]))
    setText(draft.get(`records:${match.id}`))
    setUnattributed(String(match.kgu_unattributed_goals))
    setNote(match.records_note ?? '')
    setDropBad(false)
    requestId.current = null
  }, [match?.id, match?.version])
  // 다른 경기를 고를 때만 안내 문구를 지움 (저장 직후 새로 불러올 때는 '저장했어요'를 남김)
  useEffect(() => setFeedback(null), [match?.id])

  const parsed = useMemo(() => (text.trim() ? parsePlayers(text, ours.short_name) : null), [text, ours.short_name])
  const kguScore = match ? (match.home_team_id === ours.id ? match.home_score : match.away_score) ?? 0 : 0
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

  async function save() {
    if (!match || !parsed || problems.length) return
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
        p_home_score: match.home_score,
        p_away_score: match.away_score,
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
      draft.set(`records:${match.id}`, '')
      setText('')
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

  if (finished.length === 0) return <p className="text-base text-fg/60">끝난 경기가 아직 없어요. ‘경기’ 탭에서 결과를 먼저 저장해 주세요.</p>

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className={label}>
          어느 경기의 기록인가요
          <select className={input} value={matchId ?? ''} onChange={(e) => setMatchId(Number(e.target.value))}>
            {[...finished].reverse().map((m) => (
              <option key={m.id} value={m.id}>
                {shortDate(m.match_date)} {team.get(m.home_team_id)} {m.home_score} : {m.away_score} {team.get(m.away_team_id)}
                {m.records_status === 'pending' ? ' (기록 대기)' : ''}
              </option>
            ))}
          </select>
        </label>
        {match && saved && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-fg/60">
            지금 저장된 기록:
            {match.records_status === 'pending' ? <Badge text="기록 대기" tone="todo" /> : <span className="text-fg">선수 {saved.length}명 · 득점 {saved.reduce((s, r) => s + r.goals, 0)}</span>}
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
              if (match) draft.set(`records:${match.id}`, e.target.value)
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
                  {extra > 0 && <> + 기록에 없는 득점 {extra}</>} {sumOk ? '=' : '≠'} 경기대 점수 <b className="font-medium">{kguScore}</b>
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
              <FeedbackLine key={e.line} value={{ tone: 'warn', text: `${e.line}번째 줄을 읽지 못했어요: “${e.text.replace(/\t/g, ' ').slice(0, 40)}” — ${e.reason}` }} />
            ))}
            {parsed.skipped.length > 0 && <p className="text-xs text-fg/60">다른 학교 선수 {parsed.skipped.length}줄은 뺐어요.</p>}
          </>
        )}

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
        <FeedbackLine value={feedback} />
        <div className="flex flex-wrap justify-end gap-2">
          {parsed && parsed.errors.length > 0 && (
            <button className={btnLine} aria-pressed={dropBad} onClick={() => setDropBad((v) => !v)}>
              {dropBad ? '✓ 읽지 못한 줄 빼고 저장' : '읽지 못한 줄 빼고 저장'}
            </button>
          )}
          <button className={btnMain} disabled={busy || !parsed || problems.length > 0} onClick={save}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>
        {match && saved && saved.length > 0 && !parsed && (
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
