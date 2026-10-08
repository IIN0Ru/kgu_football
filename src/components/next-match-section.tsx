/**
 * 다음 경기 (impeccable polish)
 * - 두 팀을 학교 로고 원(출처 표기, team-crest.tsx)과 이름으로 마주 세움
 * - 상태 알약: 일정이 있으면 D-day, 당일이면 '오늘 경기', 없으면 '일정 발표 전' (한국 날짜 기준, 시각 미정이어도 날짜로 계산)
 * - 일시: 시각 미정이면 '10월 9일 (금) · 시간 확인 중'
 * - 일시·장소·대회를 아이콘과 함께 정리. 모르는 값은 '확인 중'으로 (지어내지 않음)
 * - 아래에 '이후 경기' 최대 3개 작은 줄 (날짜 · 상대 로고·이름 · 홈/원정 · 시각)
 */
import { Eyebrow } from '@/components/eyebrow'
import { CalendarDays, MapPin, Trophy } from 'lucide-react'
import { ourTeam, type LaterMatch, type NextMatch } from '@/data/home'
import { TeamCrest } from '@/components/team-crest'
import { dDay, formatMatchWhen } from '@/lib/match-time'

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-4">
      <Icon className="h-4 w-4 shrink-0 text-fg/60" aria-hidden="true" />
      <dt className="w-10 shrink-0 text-sm text-fg/60">{label}</dt>
      <dd className={`min-w-0 text-base ${value ? '' : 'text-fg/60'}`}>{value ?? '확인 중'}</dd>
    </div>
  )
}

export function NextMatchSection({
  match,
  later = [],
  titleId,
  now,
}: {
  match: NextMatch
  later?: LaterMatch[]
  titleId: string
  /** 기준 시각 (페이지를 연 순간, home.ts pageOpenedAt) */
  now: Date
}) {
  // D-day 와 일시 모두 한국 시간 기준 (방문자 시간대와 무관, 리뷰 반영 2026-10-07)
  const count = match.date ? dDay(match.date, now) : null
  const when = match.date ? formatMatchWhen(match.date, match.time) : null

  return (
    <div className="flex h-full flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Eyebrow>Next match</Eyebrow>
          <h2
            id={titleId}
            className="section-title text-4xl leading-[0.95] md:text-6xl"
          >
            다음 경기
          </h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            count?.today ? 'bg-win text-on-win' : count ? 'bg-accent text-on-accent' : 'border border-line text-fg/70'
          }`}
        >
          {count ? count.label : '일정 발표 전'}
        </span>
      </div>

      {/* 맞대결: 양 팀 모두 흰색 원 안의 학교 로고 (예전 크림색 강조는 밝은 테마 전환 때 없앰) */}
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <TeamCrest name={match.home} className="h-14 w-14 text-xl md:h-16 md:w-16 md:text-2xl" />
          <span
            className={`truncate text-2xl font-medium tracking-[-0.03em] md:text-3xl ${
              match.home !== ourTeam ? 'text-fg/70' : ''
            }`}
          >
            {match.home}
          </span>
        </div>
        <span className="shrink-0 text-sm text-fg/60">vs</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <span
            className={`truncate text-right text-2xl font-medium tracking-[-0.03em] md:text-3xl ${
              match.away !== ourTeam ? 'text-fg/70' : ''
            }`}
          >
            {match.away}
          </span>
          <TeamCrest name={match.away} className="h-14 w-14 text-xl md:h-16 md:w-16 md:text-2xl" />
        </div>
      </div>

      <dl className="flex flex-col border-b border-line">
        <InfoRow icon={CalendarDays} label="일시" value={when} />
        <InfoRow icon={MapPin} label="장소" value={match.venue ? `${match.venue}${match.side ? ` · ${match.side}` : ''}` : null} />
        <InfoRow icon={Trophy} label="대회" value={match.competition} />
      </dl>


      {/* 이후 경기 */}
      {later.length > 0 && (
        <div className="mt-auto flex flex-col">
          <h3 className="mb-2 text-sm text-fg/60">이후 경기</h3>
          <ul>
            {later.map((m) => (
              <li key={`${m.date}-${m.opponent}`} className="flex items-center gap-3 border-t border-line py-3">
                <span className="w-10 shrink-0 text-sm tabular-nums text-fg/60">{m.date}</span>
                <TeamCrest name={m.opponent} className="h-7 w-7 text-xs" />
                <span className="min-w-0 flex-1 truncate text-base font-medium">
                  {m.opponent}
                  <span className="ml-2 text-xs font-normal text-fg/60">{m.side}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-fg/60">{m.time ?? '시간 확인 중'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
