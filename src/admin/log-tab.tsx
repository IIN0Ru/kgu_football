/** 수정 기록 탭: 누가 언제 무엇을 바꿨는지 (recent_changes, 운영진만) + 사이트 반영 여부 */
import { useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { friendlyError, supabase } from './client'
import { shortDate, statusLabel, type AdminData, type MatchStatus } from './data'
import { Badge, btnLine, FeedbackLine, type Feedback } from './ui'

interface Change {
  at: string
  actor: string
  table_name: string
  op: 'INSERT' | 'UPDATE' | 'DELETE'
  row_key: Record<string, unknown> | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

const TABLE: Record<string, string> = { matches: '경기', player_records: '선수 기록', standings: '순위표', posts: '글', teams: '학교', players: '선수' }
const FIELD: Record<string, string> = {
  status: '상태',
  home_score: '홈 점수',
  away_score: '원정 점수',
  match_date: '날짜',
  kickoff: '시각',
  venue: '장소',
  archived_at: '보관',
  records_status: '선수 기록',
  kgu_unattributed_goals: '기록에 없는 득점',
  records_note: '사유',
  title: '제목',
  summary: '소개',
  url: '주소',
  category: '분류',
  published_on: '날짜',
  position: '순서',
  short_name: '이름',
  name: '이름',
}
const SKIP = new Set(['version', 'updated_at', 'updated_by', 'id'])

const time = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString()
  return `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))} ${d.slice(11, 16)}`
}
const show = (k: string, v: unknown) => {
  if (v === null || v === undefined || v === '') return '없음'
  if (k === 'status') return statusLabel[v as MatchStatus] ?? String(v)
  if (k === 'records_status') return ({ pending: '대기', complete: '완료', unavailable: '없음' } as Record<string, string>)[v as string] ?? String(v)
  if (k === 'archived_at') return '보관됨'
  return String(v).length > 30 ? `${String(v).slice(0, 30)}…` : String(v)
}

export function LogTab({ data, siteChangedAt }: { data: AdminData; siteChangedAt: string | null }) {
  const [rows, setRows] = useState<Change[] | null>(null)
  const [limit, setLimit] = useState(50)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const team = useMemo(() => new Map(data.teams.map((t) => [t.id, t.short_name])), [data.teams])
  const matchName = useMemo(
    () => new Map(data.matches.map((m) => [m.id, `${shortDate(m.match_date)} ${team.get(m.home_team_id)} vs ${team.get(m.away_team_id)}`])),
    [data.matches, team],
  )

  useEffect(() => {
    supabase.rpc('recent_changes', { p_limit: limit }).then(({ data: d, error }) => {
      if (error) setFeedback({ tone: 'error', text: friendlyError(error) })
      else setRows(d as Change[])
    })
  }, [limit, data])

  // 한 번 저장(한 트랜잭션)에 바뀐 줄은 시각이 똑같음 → 한 줄로 묶음 (선수 기록 저장 = 경기 + 선수 줄 + 새 선수)
  const groups = useMemo(() => {
    const out: { at: string; actor: string; items: Change[] }[] = []
    for (const r of rows ?? []) {
      const last = out[out.length - 1]
      if (last && last.actor === r.actor && last.at === r.at) last.items.push(r)
      else out.push({ at: r.at, actor: r.actor, items: [r] })
    }
    return out
  }, [rows])

  function describeOne(r: Change) {
    const row = (r.after ?? r.before ?? {}) as Record<string, unknown>
    const name =
      r.table_name === 'matches'
        ? matchName.get(row.id as number) ?? '경기'
        : r.table_name === 'posts'
          ? `글 ${show('title', row.title)}`
          : r.table_name === 'teams'
            ? `학교 ${row.short_name}`
            : r.table_name === 'players'
              ? `선수 ${row.name}`
              : TABLE[r.table_name] ?? r.table_name
    if (r.op === 'INSERT') return `${name} — 추가`
    if (r.op === 'DELETE') return `${name} — 지움`
    const changes = Object.keys(r.after ?? {})
      .filter((k) => !SKIP.has(k) && JSON.stringify(r.before?.[k]) !== JSON.stringify(r.after?.[k]))
      .map((k) => (k === 'archived_at' ? (r.after?.[k] ? '보관' : '되살림') : `${FIELD[k] ?? k} ${show(k, r.before?.[k])} → ${show(k, r.after?.[k])}`))
    return `${name} — ${changes.join(', ') || '변경 없음'}`
  }

  function describe(g: (typeof groups)[number]) {
    const recs = g.items.filter((x) => x.table_name === 'player_records')
    if (recs.length) {
      const matchId = (recs[0].after ?? recs[0].before)?.match_id as number
      const saved = recs.filter((x) => x.op === 'INSERT').length
      const fresh = g.items.filter((x) => x.table_name === 'players' && x.op === 'INSERT').map((x) => x.after?.name)
      return `${matchName.get(matchId) ?? '경기'} — 선수 기록 ${saved}명 저장${fresh.length ? ` (새 선수 ${fresh.join(', ')})` : ''}`
    }
    const st = g.items.filter((x) => x.table_name === 'standings')
    if (st.length) return `순위표 ${new Set(st.map((x) => (x.after ?? x.before)?.team_id)).size}팀 ${st.every((x) => x.op === 'DELETE') ? '지움' : '저장'}`
    return g.items.length > 1 ? `${describeOne(g.items[0])} 외 ${g.items.length - 1}건` : describeOne(g.items[0])
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-fg/60">최근 {limit}건 · 잘못 고친 것은 해당 탭에서 다시 고치면 돼요 (보관한 것은 보관함·‘보관된 경기 보기’에서 되살리기)</span>
      <FeedbackLine value={feedback} />
      {rows === null && !feedback && <p className="text-base text-fg/60">불러오는 중…</p>}
      <ul>
        {groups.map((g, gi) => {
          const live = siteChangedAt !== null && new Date(g.at) <= new Date(siteChangedAt)
          return (
            <li key={gi} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 border-t border-line py-3 md:grid-cols-[7rem_10rem_1fr_auto]">
              <span className="text-sm text-fg/60">{time(g.at)}</span>
              <span className="hidden text-sm md:block">{g.actor}</span>
              <span className="text-base">{describe(g)}</span>
              {siteChangedAt !== null ? <Badge text={live ? '반영됨' : '반영 전'} tone={live ? 'plain' : 'todo'} /> : <span />}
            </li>
          )
        })}
      </ul>
      {rows && rows.length >= limit && limit < 200 && (
        <button className={`${btnLine} self-start`} onClick={() => setLimit((l) => Math.min(200, l + 50))}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />더 보기
        </button>
      )}
    </div>
  )
}
