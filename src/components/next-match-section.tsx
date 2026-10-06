/**
 * 다음 경기 (impeccable polish)
 * - 두 팀을 이니셜 원(학교 로고 대신)과 이름으로 마주 세움
 * - 상태 알약: 일정이 있으면 D-day, 당일이면 '오늘 경기', 없으면 '일정 발표 전'
 * - 일시·장소·대회를 아이콘과 함께 정리. 모르는 값은 '확인 중'으로 (지어내지 않음)
 */
import { ArrowUpRight, CalendarDays, MapPin, Trophy } from 'lucide-react'
import { ourTeam, type NextMatch } from '@/data/home'

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

function Crest({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-medium md:h-16 md:w-16 md:text-2xl ${
        muted ? 'border border-line text-cream/50' : 'bg-cream text-black'
      }`}
    >
      {name.slice(0, 1)}
    </span>
  )
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
      <Icon className="h-4 w-4 shrink-0 text-cream/50" aria-hidden="true" />
      <dt className="w-10 shrink-0 text-sm text-cream/60">{label}</dt>
      <dd className={`min-w-0 text-base ${value ? '' : 'text-cream/50'}`}>{value ?? '확인 중'}</dd>
    </div>
  )
}

export function NextMatchSection({
  match,
  titleId,
  ctaHref,
}: {
  match: NextMatch
  titleId: string
  ctaHref: string
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
            count?.today ? 'bg-win text-black' : count ? 'bg-cream text-black' : 'border border-line text-cream/70'
          }`}
        >
          {count ? count.label : '일정 발표 전'}
        </span>
      </div>

      {/* 맞대결: 경기대는 홈·원정 어느 쪽이든 크림색 원과 밝은 글자로 강조 */}
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Crest name={match.home} muted={match.home !== ourTeam} />
          <span
            className={`truncate text-2xl font-medium tracking-[-0.03em] md:text-3xl ${
              match.home !== ourTeam ? 'text-cream/70' : ''
            }`}
          >
            {match.home}
          </span>
        </div>
        <span className="shrink-0 text-sm text-cream/40">vs</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <span
            className={`truncate text-right text-2xl font-medium tracking-[-0.03em] md:text-3xl ${
              match.away !== ourTeam ? 'text-cream/70' : ''
            }`}
          >
            {match.away}
          </span>
          <Crest name={match.away} muted={match.away !== ourTeam} />
        </div>
      </div>

      <dl className="flex flex-col border-b border-line">
        <InfoRow icon={CalendarDays} label="일시" value={when} />
        <InfoRow icon={MapPin} label="장소" value={match.venue ? `${match.venue}${match.side ? ` · ${match.side}` : ''}` : null} />
        <InfoRow icon={Trophy} label="대회" value={match.competition} />
      </dl>

      <a
        href={ctaHref}
        target="_blank"
        rel="noopener"
        className="group mt-auto inline-flex items-center gap-2 self-start rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base"
      >
        인스타그램에서 일정 확인
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
          <ArrowUpRight className="h-4 w-4 text-cream" aria-hidden="true" />
        </span>
      </a>
    </div>
  )
}
