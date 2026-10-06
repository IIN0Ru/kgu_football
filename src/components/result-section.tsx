/**
 * 최근 결과
 * - 대회·날짜·장소 한 줄, 두 팀 점수(전광판처럼 굴러 올라감)
 * - 경기대가 홈이든 원정이든 경기대 쪽을 밝게, 상대는 한 단계 낮춤
 * - 승리/무승부/패배 자동 판정 (승리만 초록), 시즌 기록과 출처
 * - 그 아래 이전 4경기를 작은 줄로: 날짜 · 상대 로고·이름 · 홈/원정 · 점수(경기대 먼저) · 승/무/패
 */
import { RollingNumber } from '@/components/motion'
import { TeamCrest } from '@/components/team-crest'
import { ourTeam, type PastMatch, type seasonRecord as SeasonRecordValue } from '@/data/home'

type Team = { name: string; score: number }
export interface RecentResult {
  competition: string
  date: string
  venue: string | null
  home: Team
  away: Team
}

export function ResultSection({
  result,
  earlier,
  record,
  source,
  titleId,
}: {
  result: RecentResult | null
  earlier: PastMatch[]
  record: typeof SeasonRecordValue
  source: { label: string; url: string }
  titleId: string
}) {
  const title = (
    <h2 id={titleId} className="section-title text-4xl font-medium leading-[0.95] tracking-[-0.04em] md:text-6xl">
      최근 결과
    </h2>
  )

  if (!result) {
    return (
      <div className="flex flex-col gap-10">
        {title}
        <p className="border-t border-line pt-6 text-fg/60">아직 이번 시즌 경기 결과가 없어요.</p>
      </div>
    )
  }

  const ours = result.home.name === ourTeam ? result.home.score : result.away.score
  const theirs = result.home.name === ourTeam ? result.away.score : result.home.score
  const verdict = ours > theirs ? '승리' : ours < theirs ? '패배' : '무승부'
  const played = record.win + record.draw + record.loss

  return (
    <div className="flex h-full flex-col gap-10">
      {title}
      <div className="flex flex-col">
        <p className="mb-3 text-sm text-fg/60">
          {[result.competition, result.date, result.venue].filter(Boolean).join(' · ')}
        </p>
        {[result.home, result.away].map((team, i) => {
          const muted = team.name !== ourTeam
          return (
            <div key={team.name} className="flex items-center justify-between border-t border-line py-4">
              <span className="flex items-center gap-3">
                <TeamCrest name={team.name} className="h-10 w-10 text-base" />
                <span className={`text-2xl font-medium ${muted ? 'text-fg/50' : ''}`}>{team.name}</span>
              </span>
              <span
                className={`text-6xl font-medium leading-none tracking-[-0.05em] md:text-7xl ${
                  muted ? 'text-fg/50' : ''
                }`}
              >
                <RollingNumber value={team.score} delay={0.3 + i * 0.15} />
              </span>
            </div>
          )
        })}
        <p className={`border-t border-line pt-4 text-sm font-medium ${verdict === '승리' ? 'text-win' : 'text-fg/60'}`}>
          {verdict}
        </p>
      </div>

      {/* 이전 경기 */}
      {earlier.length > 0 && (
        <div className="flex flex-col">
          <h3 className="mb-2 text-sm text-fg/60">이전 경기</h3>
          <ul>
            {earlier.map((m) => {
              const v = m.ours > m.theirs ? '승' : m.ours < m.theirs ? '패' : '무'
              return (
                <li key={`${m.date}-${m.opponent}`} className="flex items-center gap-3 border-t border-line py-3">
                  <span className="w-10 shrink-0 text-sm tabular-nums text-fg/50">{m.date}</span>
                  <TeamCrest name={m.opponent} className="h-7 w-7 text-xs" />
                  <span className="min-w-0 flex-1 truncate text-base font-medium">
                    {m.opponent}
                    <span className="ml-2 text-xs font-normal text-fg/50">{m.side}</span>
                  </span>
                  <span className="text-base font-medium tabular-nums">
                    {m.ours} : {m.theirs}
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      v === '승' ? 'bg-win text-on-win' : 'border border-line text-fg/60'
                    }`}
                    aria-label={v === '승' ? '승리' : v === '패' ? '패배' : '무승부'}
                  >
                    {v}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 시즌 기록 */}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4 text-sm">
        <p className="flex flex-col gap-1">
          <span className="text-fg/60">이번 시즌 {played}경기</span>
          <span className="text-lg font-medium tabular-nums">
            {record.win}승 {record.draw}무 {record.loss}패
            <span className="ml-3 text-sm font-normal text-fg/50">
              득점 {record.goalsFor} · 실점 {record.goalsAgainst}
            </span>
          </span>
        </p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener"
          className="text-fg/60 underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg"
        >
          출처 {source.label}
        </a>
      </div>
    </div>
  )
}
