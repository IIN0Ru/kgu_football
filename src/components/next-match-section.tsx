/**
 * 다음 경기 (impeccable polish)
 * - 두 팀을 학교 로고 원(출처 표기, team-crest.tsx)과 이름으로 마주 세움
 * - 상태 알약: 일정이 있으면 D-day, 당일이면 '오늘 경기', 없으면 '일정 발표 전'
 * - 일시·장소·대회를 아이콘과 함께 정리. 모르는 값은 '확인 중'으로 (지어내지 않음)
 * - 아래에 '이후 경기' 최대 3개 작은 줄 (날짜 · 상대 로고·이름 · 홈/원정 · 시각)
 */
import { CalendarDays, MapPin, Trophy } from 'lucide-react'
import { ourTeam, type LaterMatch, type NextMatch } from '@/data/home'
import { TeamCrest } from '@/components/team-crest'

function dDay(kickoff: string): { label: string; today: boolean } | null {
  const t = new Date(kickoff)
  if (Number.isNaN(t.getTime())) return null
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((day(t) - day(new Date())) / 86_400_000)
  if (diff < 0) return null
  if (diff === 0) return { label: '오늘 경기', today: true }
  return { label: `D-${diff}`, today: false }
}

function formatKickoff(kickoff: string) {
  const t = new Date(kickoff)
  if (Number.isNaN(t.getTime())) return null
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(t)
}

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
      <Icon className="h-4 w-4 shrink-0 text-fg/50" aria-hidden="true" />
      <dt className="w-10 shrink-0 text-sm text-fg/60">{label}</dt>
      <dd className={`min-w-0 text-base ${value ? '' : 'text-fg/50'}`}>{value ?? '확인 중'}</dd>
    </div>
  )
}

export function NextMatchSection({
  match,
  later = [],
  titleId,
}: {
  match: NextMatch
  later?: LaterMatch[]
  titleId: string
}) {
  const count = match.kickoff ? dDay(match.kickoff) : null
  const when = match.kickoff ? formatKickoff(match.kickoff) : null

  return (
    <div className="flex h-full flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id={titleId}
          className="section-title text-4xl font-medium leading-[0.95] tracking-[-0.04em] md:text-6xl"
        >
          다음 경기
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            count?.today ? 'bg-win text-on-win' : count ? 'bg-accent text-on-accent' : 'border border-line text-fg/70'
          }`}
        >
          {count ? count.label : '일정 발표 전'}
        </span>
      </div>

      {/* 맞대결: 경기대는 홈·원정 어느 쪽이든 크림색 원과 밝은 글자로 강조 */}
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
        <span className="shrink-0 text-sm text-fg/40">vs</span>
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
                <span className="w-10 shrink-0 text-sm tabular-nums text-fg/50">{m.date}</span>
                <TeamCrest name={m.opponent} className="h-7 w-7 text-xs" />
                <span className="min-w-0 flex-1 truncate text-base font-medium">
                  {m.opponent}
                  <span className="ml-2 text-xs font-normal text-fg/50">{m.side}</span>
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
