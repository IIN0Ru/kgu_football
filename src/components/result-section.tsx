/**
 * 최근 결과
 * - 대회·날짜·장소 한 줄, 두 팀 점수(전광판처럼 굴러 올라감)
 * - 경기대가 홈이든 원정이든 경기대 쪽을 밝게, 상대는 한 단계 낮춤
 * - 승리/무승부/패배 자동 판정 (승리만 초록), 시즌 기록과 출처
 */
import { RollingNumber } from '@/components/motion'
import { TeamCrest } from '@/components/team-crest'
import { ourTeam, type seasonRecord as SeasonRecordValue } from '@/data/home'

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
  record,
  source,
  titleId,
}: {
  result: RecentResult | null
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
        <p className="border-t border-line pt-6 text-cream/60">아직 이번 시즌 경기 결과가 없어요.</p>
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
        <p className="mb-3 text-sm text-cream/60">
          {[result.competition, result.date, result.venue].filter(Boolean).join(' · ')}
        </p>
        {[result.home, result.away].map((team, i) => {
          const muted = team.name !== ourTeam
          return (
            <div key={team.name} className="flex items-center justify-between border-t border-line py-4">
              <span className="flex items-center gap-3">
                <TeamCrest name={team.name} className="h-10 w-10 text-base" />
                <span className={`text-2xl font-medium ${muted ? 'text-cream/50' : ''}`}>{team.name}</span>
              </span>
              <span
                className={`text-6xl font-medium leading-none tracking-[-0.05em] md:text-7xl ${
                  muted ? 'text-cream/50' : ''
                }`}
              >
                <RollingNumber value={team.score} delay={0.3 + i * 0.15} />
              </span>
            </div>
          )
        })}
        <p className={`border-t border-line pt-4 text-sm font-medium ${verdict === '승리' ? 'text-win' : 'text-cream/60'}`}>
          {verdict}
        </p>
      </div>

      {/* 시즌 기록 */}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4 text-sm">
        <p className="flex flex-col gap-1">
          <span className="text-cream/60">이번 시즌 {played}경기</span>
          <span className="text-lg font-medium tabular-nums">
            {record.win}승 {record.draw}무 {record.loss}패
            <span className="ml-3 text-sm font-normal text-cream/50">
              득점 {record.goalsFor} · 실점 {record.goalsAgainst}
            </span>
          </span>
        </p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener"
          className="text-cream/60 underline decoration-cream/30 underline-offset-4 transition-colors hover:text-cream"
        >
          출처 {source.label}
        </a>
      </div>
    </div>
  )
}
