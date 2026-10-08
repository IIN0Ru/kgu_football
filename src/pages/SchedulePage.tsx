/**
 * 경기 일정 페이지 (/schedule) — 2026-10-08 시안
 * - 시즌 전체 경기를 달별로. 끝난 경기는 점수(홈 먼저), 남은 경기는 시각(미정이면 '시간 확인 중')
 * - 거르기: 전체·남은 경기·끝난 경기 / 전체·홈·원정
 * - 캘린더: 경기마다 구글 캘린더 추가·.ics 받기, 맨 위에서 시즌 전체 .ics 받기 (모두 한국 시간)
 * - 가장 가까운 남은 경기는 D-day 알약으로 강조. 날짜가 지났는데 점수가 없으면 '결과 확인 중'
 */
import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Download } from 'lucide-react'
import { DockNav } from '@/components/dock-nav'
import { Eyebrow } from '@/components/eyebrow'
import { Reveal } from '@/components/motion'
import { SiteBackground } from '@/components/site-background'
import { SiteFooter } from '@/components/site-footer'
import { TeamCrest } from '@/components/team-crest'
import { heroImage, heroLogo, pageOpenedAt } from '@/data/home'
import { navItems } from '@/data/nav'
import {
  nextScheduleMatch,
  scheduleCompetition,
  scheduleMatches,
  scheduleSource,
  scheduleUpdatedAt,
  type ScheduleMatch,
} from '@/data/schedule'
import { buildIcs, googleCalendarUrl, type CalendarMatch } from '@/lib/calendar'
import { dDay, dayParts } from '@/lib/match-time'

type WhenFilter = 'all' | 'upcoming' | 'played'
type SideFilter = 'all' | '홈' | '원정'

const toCal = (m: ScheduleMatch): CalendarMatch => ({
  date: m.date,
  time: m.time,
  home: m.home,
  away: m.away,
  venue: m.venue,
  competition: scheduleCompetition,
})

function downloadIcs(name: string, matches: ScheduleMatch[]) {
  const text = buildIcs(matches.map(toCal), new Date())
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full border border-line bg-bar p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
            value === o.value ? 'bg-accent text-on-accent' : 'text-fg/70 hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function MatchRow({ m }: { m: ScheduleMatch }) {
  const { day, weekday } = dayParts(m.date)
  const isNext = nextScheduleMatch === m
  const count = isNext ? dDay(m.date, pageOpenedAt) : null
  const center =
    m.status === 'played' ? (
      <span className="font-num text-2xl tabular-nums md:text-3xl">
        {m.homeScore}
        <span className="mx-1.5 text-fg/40">:</span>
        {m.awayScore}
      </span>
    ) : (
      <span className={`text-sm tabular-nums ${m.time ? 'font-medium' : 'text-fg/50'}`}>{m.time ?? '시간 확인 중'}</span>
    )

  return (
    <li
      className={`grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-t border-line py-5 md:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,16rem)_10.5rem] md:gap-x-6 ${
        isNext ? 'relative before:absolute before:inset-y-2 before:-left-3 before:w-1 before:rounded-full before:bg-accent' : ''
      }`}
    >
      {/* 날짜 */}
      <div className="flex flex-col leading-none">
        <span className="font-num text-3xl tabular-nums md:text-4xl">{day}</span>
        <span className="mt-1 text-xs text-fg/50">{weekday}요일</span>
      </div>

      {/* 맞대결: 홈 이름·로고 · 점수/시각 · 원정 로고·이름 */}
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <span className="min-w-0 flex-1 truncate text-right text-sm font-medium sm:text-base">{m.home}</span>
        <TeamCrest name={m.home} className="h-8 w-8 text-sm md:h-9 md:w-9" />
        <span className="flex w-20 shrink-0 justify-center md:w-24">{center}</span>
        <TeamCrest name={m.away} className="h-8 w-8 text-sm md:h-9 md:w-9" />
        <span className="min-w-0 flex-1 truncate text-left text-sm font-medium sm:text-base">{m.away}</span>
      </div>

      {/* 장소·홈/원정·상태 (모바일은 아래 줄) */}
      <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg/60 md:col-start-3">
        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-fg/70">{m.side}</span>
        <span className="min-w-0 truncate">{m.venue ?? '장소 확인 중'}</span>
        {count && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${count.today ? 'bg-win text-on-win' : 'bg-accent text-on-accent'}`}>
            {count.label}
          </span>
        )}
        {m.status === 'pending' && <span className="text-xs text-fg/50">결과 확인 중</span>}
      </div>

      {/* 캘린더 (남은 경기만) */}
      <div className="col-start-2 flex gap-2 md:col-start-4 md:justify-end">
        {m.status === 'upcoming' && (
          <>
            <a
              href={googleCalendarUrl(toCal(m))}
              target="_blank"
              rel="noopener"
              aria-label={`${m.date} ${m.home} 대 ${m.away} 경기를 구글 캘린더에 추가 (새 창)`}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-fg/80 transition-colors hover:border-accent hover:bg-accent hover:text-on-accent"
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              구글
            </a>
            <button
              type="button"
              onClick={() => downloadIcs(`kgu-${m.date}.ics`, [m])}
              aria-label={`${m.date} ${m.home} 대 ${m.away} 경기 캘린더 파일(.ics) 받기`}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-fg/80 transition-colors hover:border-accent hover:bg-accent hover:text-on-accent"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              .ics
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export function SchedulePage() {
  const [when, setWhen] = useState<WhenFilter>('all')
  const [side, setSide] = useState<SideFilter>('all')

  // 페이지를 바꾸면 맨 위에서 시작
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [])

  const played = scheduleMatches.filter((m) => m.status === 'played').length
  const remaining = scheduleMatches.filter((m) => m.status === 'upcoming').length

  const months = useMemo(() => {
    const list = scheduleMatches.filter(
      (m) =>
        (when === 'all' || (when === 'played' ? m.status === 'played' : m.status !== 'played')) &&
        (side === 'all' || m.side === side),
    )
    const groups = new Map<number, ScheduleMatch[]>()
    for (const m of list) {
      const month = dayParts(m.date).month
      groups.set(month, [...(groups.get(month) ?? []), m])
    }
    return [...groups.entries()]
  }, [when, side])

  return (
    <>
      <SiteBackground away image={heroImage} />
      <DockNav items={navItems} staticLogo={{ src: heroLogo.darkSrc, alt: heroLogo.alt }} />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-2 p-2 pt-16 md:gap-3 md:p-3 md:pt-20">
        <Reveal
          aria-labelledby="schedule-title"
          className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
        >
          <div className="flex flex-col gap-10">
            {/* 머리: 제목·요약·시즌 캘린더 */}
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col gap-3">
                <Eyebrow>Schedule 2026</Eyebrow>
                <h1 id="schedule-title" className="section-title text-4xl leading-[0.95] md:text-6xl">
                  경기 일정
                </h1>
                <p className="text-sm text-fg/60">
                  {scheduleCompetition} · {scheduleMatches.length}경기 · 끝난 경기 {played} · 남은 경기 {remaining}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadIcs('kgu-football-2026.ics', scheduleMatches)}
                className="group flex items-center gap-3 rounded-full border border-line bg-bar py-1.5 pl-4 pr-1.5 text-sm transition-colors hover:border-accent"
              >
                시즌 전체 일정 캘린더에 넣기
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent transition-transform group-hover:scale-110">
                  <Download className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            </div>

            {/* 거르기 */}
            <div className="flex flex-wrap gap-2">
              <Segmented<WhenFilter>
                label="경기 상태"
                value={when}
                onChange={setWhen}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'upcoming', label: '남은 경기' },
                  { value: 'played', label: '끝난 경기' },
                ]}
              />
              <Segmented<SideFilter>
                label="홈·원정"
                value={side}
                onChange={setSide}
                options={[
                  { value: 'all', label: '홈·원정' },
                  { value: '홈', label: '홈' },
                  { value: '원정', label: '원정' },
                ]}
              />
            </div>

            {/* 목록: 달별 */}
            {months.length === 0 ? (
              <p className="border-t border-line pt-6 text-fg/60">조건에 맞는 경기가 없어요.</p>
            ) : (
              <div className="flex flex-col gap-8">
                {months.map(([month, list]) => (
                  <section key={month} aria-label={`${month}월`}>
                    <h2 className="mb-1 flex items-baseline gap-1 text-fg/70">
                      <span className="font-num text-2xl text-fg">{month}</span>월
                    </h2>
                    <ul className="border-b border-line">
                      {list.map((m) => (
                        <MatchRow key={`${m.date}-${m.home}`} m={m} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            <p className="text-sm text-fg/60">
              <a
                href={scheduleSource.url}
                target="_blank"
                rel="noopener"
                className="underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg"
              >
                출처 {scheduleSource.label}
              </a>
              {' · '}자료 갱신 {Number(scheduleUpdatedAt.slice(5, 7))}월 {Number(scheduleUpdatedAt.slice(8))}일 · 시각은 한국 시간
            </p>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </>
  )
}
