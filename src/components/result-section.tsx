/**
 * 최근 결과
 * - 전광판처럼 한 줄: 홈 이름 · 홈 로고 · 점수 · 원정 로고 · 원정 이름 (가운데 정렬, 사용자 요청 2026-10-07)
 * - 승리/무승부/패배 표시 없음 (사용자 요청으로 뺌). 점수는 홈 먼저
 * - 위: 대회·날짜·장소 한 줄 + 가장 최근 경기를 크게 (점수 굴러 올라가는 모션은 사용자 요청으로 뺌)
 * - 아래: 이전 4경기를 작은 줄로 (왼쪽에 작은 날짜) → 시즌 기록과 출처는 그대로
 * - 경기가 끝났는데 점수가 아직 없으면 맨 위에 '결과 확인 중' 줄 (UX 점검 2026-10-08)
 */
import { Eyebrow } from '@/components/eyebrow'
import { PageLinkRow } from '@/components/page-link-row'
import { TeamCrest } from '@/components/team-crest'
import type { PastMatch, PendingResult, seasonRecord as SeasonRecordValue } from '@/data/home'

type Team = { name: string; score: number }
export interface RecentResult {
  competition: string
  date: string
  shortDate: string
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
  pending = null,
}: {
  result: RecentResult | null
  pending?: PendingResult | null
  earlier: PastMatch[]
  record: typeof SeasonRecordValue
  source: { label: string; url: string }
  titleId: string
}) {
  const title = (
    <div className="flex flex-col gap-3">
      <Eyebrow>Results</Eyebrow>
      <h2 id={titleId} className="section-title text-4xl leading-[0.95] md:text-6xl">
        최근 결과
      </h2>
    </div>
  )

  const pendingLine = pending && (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-line py-3 text-sm">
      <span className="rounded-full border border-line px-2 py-0.5 text-xs text-fg/70">결과 확인 중</span>
      <span>
        {pending.date} · {pending.home} vs {pending.away}
      </span>
    </p>
  )

  if (!result) {
    return (
      <div className="flex flex-col gap-10">
        {title}
        {pendingLine}
        <p className="border-t border-line pt-6 text-fg/60">아직 이번 시즌 경기 결과가 없어요.</p>
      </div>
    )
  }

  const played = record.win + record.draw + record.loss

  return (
    <div className="flex h-full flex-col gap-10">
      {title}

      <div className="flex flex-col">
        {pendingLine && <div className="mb-6">{pendingLine}</div>}
        {/* 가장 최근 경기: 크게 */}
        <p className="mb-3 text-sm text-fg/60">
          {[result.competition, result.date, result.venue].filter(Boolean).join(' · ')}
        </p>
        <ScoreLine
          home={result.home}
          away={result.away}
          large
        />

        {/* 이전 경기 */}
        {earlier.length > 0 && (
          <>
            <h3 className="mb-1 mt-8 text-sm text-fg/60">이전 경기</h3>
            <ul>
              {earlier.map((m) => (
                <li key={`${m.date}-${m.home.name}-${m.away.name}`} className="border-t border-line first:border-t-0">
                  <ScoreLine home={m.home} away={m.away} date={m.date} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* 시즌 기록 */}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4 text-sm">
        <p className="flex flex-col gap-1">
          <span className="text-fg/60">이번 시즌 {played}경기</span>
          <span className="font-num text-xl tabular-nums tracking-[0.02em]">
            {record.win}승 {record.draw}무 {record.loss}패
            <span className="ml-3 text-sm font-normal text-fg/60">
              득점 {record.goalsFor} · 실점 {record.goalsAgainst}
            </span>
          </span>
        </p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener"
          className="tap-area text-fg/60 underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg"
        >
          출처 {source.label}
        <span className="sr-only">(새 창)</span></a>
      </div>
      <PageLinkRow to="/records" className="-mt-6">시즌 기록 전체 보기</PageLinkRow>
    </div>
  )
}

/** 전광판 한 줄: 홈 이름 · 홈 로고 · 점수 · 원정 로고 · 원정 이름 (가운데 정렬, 승패 표시 없음) */
function ScoreLine({
  home,
  away,
  date,
  large,
}: {
  home: Team
  away: Team
  date?: string
  large?: boolean
}) {
  const name = `min-w-0 flex-1 truncate font-medium ${large ? 'text-base sm:text-xl md:text-2xl' : 'text-sm sm:text-base'}`
  const crest = large ? 'h-10 w-10 text-base sm:h-12 sm:w-12 md:h-14 md:w-14' : 'h-8 w-8 text-sm sm:h-9 sm:w-9'
  return (
    <div className={`relative flex items-center gap-2 sm:gap-3 md:gap-4 ${large ? 'py-5' : 'py-3'}`}>
      {date && <span className="absolute left-0 text-xs tabular-nums text-fg/60">{date}</span>}
      <span className={`${name} text-right ${date ? 'pl-10' : ''}`}>{home.name}</span>
      <TeamCrest name={home.name} className={crest} />
      <span
        className={`shrink-0 text-center font-num tabular-nums tracking-[0.01em] ${
          large ? 'w-20 text-4xl sm:w-28 sm:text-5xl md:w-32 md:text-6xl' : 'w-14 text-xl sm:w-16 sm:text-2xl'
        }`}
      >
        {home.score}
        <span className="mx-1.5 text-fg/40">:</span>
        {away.score}
      </span>
      <TeamCrest name={away.name} className={crest} />
      <span className={`${name} text-left`}>{away.name}</span>
    </div>
  )
}
