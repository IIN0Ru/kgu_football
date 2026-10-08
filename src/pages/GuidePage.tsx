/**
 * 직관 가이드 페이지 (/guide) — 2026-10-08 시안 (승인 대기)
 * - 홈 경기장(경기대 대운동장)만. 다음 홈 경기 → 지도 · 주소 → 가는 길(지하철·버스·자가용) → 확인 중 항목 → 출처
 * - 지도는 오픈스트리트맵 퍼가기(사용자 선택 '지도 화면 넣기'). 화면에 보일 때만 불러옴(loading=lazy)
 */
import { useEffect, useState } from 'react'
import { Bus, Car, Check, Copy, ExternalLink, MapPin, TrainFront } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DockNav } from '@/components/dock-nav'
import { Eyebrow } from '@/components/eyebrow'
import { Reveal } from '@/components/motion'
import { SiteBackground } from '@/components/site-background'
import { SiteFooter } from '@/components/site-footer'
import { TeamCrest } from '@/components/team-crest'
import { heroImage, heroLogo, ourTeam, pageOpenedAt } from '@/data/home'
import { navItems, pageLinks } from '@/data/nav'
import { scheduleMatches } from '@/data/schedule'
import { buses, driving, guideCheckedAt, guideSources, subway, unknowns, venue, venueMap } from '@/data/guide'
import { dDay, formatMatchWhen } from '@/lib/match-time'

const card = 'rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10'
const nextHome = scheduleMatches.find((m) => m.status === 'upcoming' && m.home === ourTeam) ?? null

function SubHead({ icon: Icon, children }: { icon: typeof Bus; children: string }) {
  return (
    <h3 className="flex items-center gap-2 text-base font-medium">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {children}
    </h3>
  )
}

function MapLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-fg/80 transition-colors hover:border-accent hover:bg-accent hover:text-on-accent"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">(새 창)</span>
    </a>
  )
}

export function GuidePage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(venue.address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // 복사를 못 하는 환경이면 주소 글자를 직접 선택하면 됨
    }
  }
  const count = nextHome ? dDay(nextHome.date, pageOpenedAt) : null
  const checked = `${Number(guideCheckedAt.slice(5, 7))}월 ${Number(guideCheckedAt.slice(8))}일`

  return (
    <>
      <SiteBackground away image={heroImage} />
      <DockNav items={navItems} staticLogo={{ src: heroLogo.darkSrc, alt: heroLogo.alt }} pageTitle="직관 가이드" pages={pageLinks} />

      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-2 p-2 pt-16 md:grid-cols-12 md:gap-3 md:p-3 md:pt-20">
        {/* 머리 + 다음 홈 경기 */}
        <div className="md:col-span-12">
          <Reveal aria-labelledby="guide-title" className={card}>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div className="flex flex-col gap-3">
                <Eyebrow>Matchday guide</Eyebrow>
                <h1 id="guide-title" className="section-title text-4xl leading-[0.95] md:text-6xl">
                  직관 가이드
                </h1>
                <p className="text-sm text-fg/60">
                  홈 경기장 · {venue.name} ({venue.campus})
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2 border-t border-line pt-4 sm:min-w-[22rem]">
                <span className="flex items-center gap-2 text-sm text-fg/60">
                  다음 홈 경기
                  {count && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${count.today ? 'bg-win text-on-win' : 'bg-accent text-on-accent'}`}>
                      {count.label}
                    </span>
                  )}
                </span>
                {nextHome ? (
                  <>
                    <span className="flex items-center gap-3">
                      <TeamCrest name={nextHome.home} className="h-10 w-10 text-sm" />
                      <span className="text-fg/40">vs</span>
                      <TeamCrest name={nextHome.away} className="h-10 w-10 text-sm" />
                      <span className="text-lg font-medium">{nextHome.away}</span>
                    </span>
                    <span className="text-sm">{formatMatchWhen(nextHome.date, nextHome.time)}</span>
                    <Link to="/schedule" className="text-sm text-fg/60 underline decoration-fg/30 underline-offset-4 hover:text-fg">
                      전체 일정 보기
                    </Link>
                  </>
                ) : (
                  <span className="text-sm text-fg/60">남은 홈 경기 일정 발표 전</span>
                )}
              </div>
            </div>
          </Reveal>
        </div>

        {/* 지도 · 주소 */}
        <div className="md:col-span-7">
          <Reveal aria-labelledby="map-title" className={card}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Eyebrow>Location</Eyebrow>
                <h2 id="map-title" className="section-title text-3xl leading-[0.95] md:text-5xl">
                  찾아오는 곳
                </h2>
              </div>
              <div className="overflow-hidden rounded-2xl border border-line bg-paper">
                <iframe
                  title={`${venue.name} 위치 지도 (오픈스트리트맵)`}
                  src={venueMap.embed}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="block aspect-[4/3] w-full md:aspect-[16/10]"
                />
              </div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-sm text-fg/60">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {venue.campus}
                  </span>
                  <span className="text-lg font-medium">{venue.address}</span>
                </div>
                <button
                  type="button"
                  onClick={copy}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-fg/80 transition-colors hover:border-accent"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span aria-live="polite">{copied ? '복사됨' : '주소 복사'}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <MapLink href={venueMap.kakao}>카카오맵</MapLink>
                <MapLink href={venueMap.naver}>네이버 지도</MapLink>
                <MapLink href={venueMap.osm}>크게 보기</MapLink>
              </div>
            </div>
          </Reveal>
        </div>

        {/* 가는 길 */}
        <div className="md:col-span-5">
          <Reveal aria-labelledby="route-title" className={card} delay={0.08}>
            <div className="flex h-full flex-col gap-8">
              <div className="flex flex-col gap-3">
                <Eyebrow>Getting here</Eyebrow>
                <h2 id="route-title" className="section-title text-3xl leading-[0.95] md:text-5xl">
                  가는 길
                </h2>
              </div>

              <section className="flex flex-col gap-3" aria-label="지하철">
                <SubHead icon={TrainFront}>지하철</SubHead>
                <ul className="flex flex-col">
                  {subway.map((s) => (
                    <li key={s.line} className="flex gap-3 border-t border-line py-2.5 text-sm">
                      <span className="w-16 shrink-0 font-medium">{s.line}</span>
                      <span className="text-fg/80">{s.text}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-col gap-3" aria-label="버스">
                <SubHead icon={Bus}>버스</SubHead>
                <ul className="flex flex-col">
                  {buses.map((b) => (
                    <li key={`${b.title}-${b.stop}`} className="flex flex-col gap-2 border-t border-line py-3">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <span className="font-medium">{b.title}</span>
                        {b.stop && <span className="text-xs text-fg/60">하차 {b.stop}</span>}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {b.lines.map((l) => (
                          <span key={l} className="rounded-md border border-line px-1.5 py-0.5 font-num text-sm tabular-nums tracking-[0.02em]">
                            {l}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-col gap-3" aria-label="자가용">
                <SubHead icon={Car}>자가용</SubHead>
                <ul className="flex flex-col">
                  {driving.map((t) => (
                    <li key={t} className="border-t border-line py-2.5 text-sm text-fg/80">
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </Reveal>
        </div>

        {/* 확인 중 + 출처 */}
        <div className="md:col-span-12">
          <Reveal aria-labelledby="more-title" className={card}>
            <div className="flex flex-col gap-6">
              <h2 id="more-title" className="text-sm text-fg/60">
                공식 자료에서 아직 확인하지 못한 것
              </h2>
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
                {unknowns.map((u) => (
                  <div key={u.label} className="flex items-baseline justify-between border-t border-line py-3">
                    <dt className="text-sm font-medium">{u.label}</dt>
                    <dd className="text-sm text-fg/50">{u.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-fg/60">
                출처{' '}
                {guideSources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && ' · '}
                    <a href={s.url} target="_blank" rel="noopener" className="underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg">
                      {s.label}
                    </a>
                  </span>
                ))}
                {' · '}
                {checked} 확인 · 버스 노선은 바뀔 수 있으니 출발 전 지도 앱으로 확인하세요
              </p>
            </div>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
