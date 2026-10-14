/** 순위표 탭: KUSF 순위표 붙여넣기 → 지금 표와 비교 → 통째로 교체 */
import { useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { friendlyError, supabase } from './client'
import { todayKst, type AdminData } from './data'
import { parseStandings, schoolKey } from './parse'
import { FeedbackLine, type Feedback } from './ui'
import { btnMain, draft, input, label } from './ui-tokens'

const cols = [
  ['rank', '순위'],
  ['team', '학교'],
  ['played', '경기'],
  ['won', '승'],
  ['drawn', '무'],
  ['lost', '패'],
  ['gd', '득실'],
  ['points', '승점'],
] as const

export function StandingsTab({ data, reload }: { data: AdminData; reload: () => Promise<void> }) {
  const [text, setText] = useState(() => draft.get('standings'))
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const requestId = useRef<string | null>(null)
  const teamByKey = useMemo(() => new Map(data.teams.map((t) => [schoolKey(t.short_name), t])), [data.teams])
  const current = useMemo(() => new Map(data.standings.map((s) => [s.team_id, s])), [data.standings])
  const base = data.standings[0] ?? { season: Number(todayKst().slice(0, 4)), competition: data.matches[0]?.competition ?? 'KUSF 대학축구 U리그 4권역', group_label: '' }

  const parsed = useMemo(() => (text.trim() ? parseStandings(text) : null), [text])
  const unknown = parsed?.rows.filter((r) => !teamByKey.has(schoolKey(r.team))) ?? []
  const ours = data.teams.find((t) => t.is_ours)!
  const hasOurs = parsed?.rows.some((r) => teamByKey.get(schoolKey(r.team))?.id === ours.id)
  const adjusted = parsed?.rows.filter((r) => r.points !== r.won * 3 + r.drawn) ?? []

  // 사이트 반영 때 검사(check-records)와 같은 기준을 저장 전에 미리 확인: 경기대 줄 = 끝난 경기를 날짜순으로 앞에서부터 N경기
  const ourRow = parsed?.rows.find((r) => teamByKey.get(schoolKey(r.team))?.id === ours.id)
  const finishedMatches = data.matches
    .filter((m) => m.status === 'finished' && !m.archived_at)
    .sort((a, b) => a.match_date.localeCompare(b.match_date) || a.id - b.id)
  let scoreMismatch: string | null = null
  if (ourRow) {
    if (ourRow.played > finishedMatches.length) {
      scoreMismatch = `순위표는 ${ourRow.played}경기인데 점수가 저장된 경기는 ${finishedMatches.length}경기예요. ‘경기’ 탭에서 점수를 먼저 저장해 주세요`
    } else {
      const t = { won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 }
      for (const m of finishedMatches.slice(0, ourRow.played)) {
        const home = m.home_team_id === ours.id
        const f = (home ? m.home_score : m.away_score) ?? 0
        const a = (home ? m.away_score : m.home_score) ?? 0
        t.gf += f
        t.ga += a
        if (f > a) t.won++
        else if (f === a) t.drawn++
        else t.lost++
      }
      if (t.won !== ourRow.won || t.drawn !== ourRow.drawn || t.lost !== ourRow.lost || t.gf !== ourRow.goalsFor || t.ga !== ourRow.goalsAgainst) {
        scoreMismatch = `${ours.short_name} 줄(${ourRow.won}승 ${ourRow.drawn}무 ${ourRow.lost}패, ${ourRow.goalsFor}득점 ${ourRow.goalsAgainst}실점)이 저장된 앞 ${ourRow.played}경기 점수(${t.won}승 ${t.drawn}무 ${t.lost}패, ${t.gf}득점 ${t.ga}실점)와 달라요. 점수나 붙여 넣은 표를 확인해 주세요`
      }
    }
  }

  const problems: string[] = []
  if (scoreMismatch) problems.push(scoreMismatch)
  if (parsed && !parsed.headerFound) problems.push('표 머리줄(순위·팀명·승·무·패·득점·실점·승점)을 찾지 못했어요. 머리줄까지 같이 복사해 주세요')
  if (parsed?.errors.length) problems.push('읽지 못한 줄을 고쳐 주세요 (순위표는 한 줄이라도 빠지면 저장하지 않아요)')
  if (unknown.length) problems.push(`모르는 학교: ${unknown.map((r) => r.team).join(', ')} — 학교 이름을 확인하거나 개발자에게 알려 주세요`)
  if (parsed?.headerFound && parsed.rows.length > 0 && !hasOurs) problems.push(`${ours.short_name} 줄이 없어요. 다른 권역의 표가 아닌지 확인해 주세요`)

  async function save() {
    if (!parsed || problems.length) return
    setBusy(true)
    setFeedback(null)
    try {
      const noYellow = parsed.missingColumns.includes('경고')
      const noRed = parsed.missingColumns.includes('퇴장')
      const rows = parsed.rows.map((r) => {
        const teamId = teamByKey.get(schoolKey(r.team))!.id
        return {
          team_id: teamId,
          rank: r.rank,
          played: r.played,
          won: r.won,
          drawn: r.drawn,
          lost: r.lost,
          goals_for: r.goalsFor,
          goals_against: r.goalsAgainst,
          points: r.points,
          // 표에 경고·퇴장 칸이 없으면 지금 값을 그대로 둠
          yellow: noYellow ? (current.get(teamId)?.yellow ?? 0) : r.yellow,
          red: noRed ? (current.get(teamId)?.red ?? 0) : r.red,
        }
      })
      // 통째로 교체를 한 번에 (0002 replace_standings): 불러온 뒤 다른 사람이 고쳤으면 PT409,
      // 경기대 줄이 저장된 점수와 어긋나면 DB 가 거부하고 아무것도 안 바뀜. 승점 조정은 DB 가 계산
      requestId.current ??= crypto.randomUUID()
      const expected = [...data.standings]
        .filter((s) => s.season === base.season && s.competition === base.competition && s.group_label === base.group_label)
        .sort((a, b) => a.team_id - b.team_id)
        .map((s) => `${s.team_id}:${s.version}`)
        .join(',')
      const { error } = await supabase.rpc('replace_standings', {
        p_season: base.season,
        p_competition: base.competition,
        p_group_label: base.group_label,
        p_expected: expected,
        p_request_id: requestId.current,
        p_rows: rows,
      })
      if (error) {
        if (!/fetch|network/i.test(error.message)) requestId.current = null
        throw error
      }
      requestId.current = null
      draft.set('standings', '')
      setText('')
      await reload()
      setFeedback({ tone: 'ok', text: `순위표 ${rows.length}팀을 저장했어요. 위의 ‘사이트에 반영’을 눌러야 사이트가 바뀌어요` })
    } catch (e) {
      setFeedback({ tone: 'error', text: friendlyError(e) })
    } finally {
      setBusy(false)
    }
  }

  // 미리보기 표: 붙여 넣은 표가 있으면 그것, 없으면 지금 저장된 표
  const view = parsed?.rows.length
    ? parsed.rows.map((r) => {
        const t = teamByKey.get(schoolKey(r.team))
        return { id: t?.id ?? -r.line, team: t?.short_name ?? r.team, rank: r.rank, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, gd: r.goalsFor - r.goalsAgainst, points: r.points, isNew: true }
      })
    : data.standings.map((s) => ({ id: s.team_id, team: data.teams.find((t) => t.id === s.team_id)?.short_name ?? '?', rank: s.rank, played: s.played, won: s.won, drawn: s.drawn, lost: s.lost, gd: s.goals_for - s.goals_against, points: s.points, isNew: false }))

  const changed = (id: number, key: (typeof cols)[number][0], v: number | string) => {
    const s = current.get(id)
    if (!s || key === 'team') return false
    const old = key === 'gd' ? s.goals_for - s.goals_against : s[key]
    return old !== v
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className={label}>
          KUSF 순위표를 머리줄까지 통째로 복사해 붙여 넣기 (저장하면 표 전체를 바꿔요)
          <textarea
            className={cn(input, 'h-64 font-mono text-sm')}
            spellCheck={false}
            value={text}
            placeholder={'순위\t팀명\t경기\t승\t무\t패\t득점\t실점\t득실\t승점 …'}
            onChange={(e) => {
              setText(e.target.value)
              draft.set('standings', e.target.value)
            }}
          />
        </label>
        <p className="text-xs text-fg/60">
          지금 표: {base.competition} · {data.standings.length}팀
          {data.standings[0] ? ` · ${data.standings[0].checked_on} 확인` : ''}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-sm text-fg/60">{parsed?.rows.length ? `미리보기 · ${parsed.rows.length}팀 · 지금 표와 바뀐 곳은 빨간 글자` : '지금 저장된 순위표'}</span>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-fg/60">
              <tr>
                {cols.map(([, h]) => (
                  <th key={h} className="border-b border-line py-2 pr-2 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.id} className={cn('border-b border-line', r.id === ours.id && 'font-medium')}>
                  {cols.map(([k]) => (
                    <td key={k} className={cn('py-2 pr-2', r.isNew && changed(r.id, k, r[k]) && 'text-accent')}>
                      {k === 'gd' && r.gd > 0 ? `+${r.gd}` : r[k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsed?.errors.map((e) => (
          <FeedbackLine key={`${e.line}-${e.reason}`} value={{ tone: 'warn', text: e.text ? `${e.line}번째 줄: ${e.reason}` : e.reason }} />
        ))}
        {adjusted.length > 0 && (
          <p className="text-sm text-fg/60">
            승점이 승·무로 계산한 값과 다른 팀: {adjusted.map((r) => `${r.team}(${r.points - (r.won * 3 + r.drawn) > 0 ? '+' : ''}${r.points - (r.won * 3 + r.drawn)})`).join(', ')} — 감점 등이면 그대로 저장해도 돼요
          </p>
        )}
        {parsed?.missingColumns.length ? <p className="text-xs text-fg/60">표에 {parsed.missingColumns.join('·')} 칸이 없어 지금 값을 그대로 둬요</p> : null}
        {problems.map((p) => (
          <p key={p} className="text-sm">
            · {p}
          </p>
        ))}
        <FeedbackLine value={feedback} />
        <div className="flex justify-end">
          <button className={btnMain} disabled={busy || !parsed || problems.length > 0} onClick={save}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {busy ? '저장 중…' : '순위표 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
