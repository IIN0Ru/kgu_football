import { DockNav } from '@/components/dock-nav'
import { SiteFooter } from '@/components/site-footer'
import { useScrollToHash } from '@/lib/use-scroll-to-hash'
import { FloatingLogo } from '@/components/floating-logo'
import { SiteBackground } from '@/components/site-background'
import { Reveal } from '@/components/motion'
import { ResultSection } from '@/components/result-section'
import { RosterSection } from '@/components/roster-section'
import { NewsSection } from '@/components/news-section'
import { NextMatchSection } from '@/components/next-match-section'
import { VenueSection } from '@/components/venue-section'
import { PrismaHero } from '@/components/ui/prisma-hero'
import { navItems, pageLinks } from '@/data/nav'
import { useHeroSnap } from '@/components/use-hero-snap'
import {
  heroImage,
  heroLogo,
  matchSource,
  news,
  blogUrl,
  magazine,
  magazineUrl,
  youtubeUrl,
  youtubeLatestEmbed,
  nextMatch,
  laterMatches,
  pageOpenedAt,
  recentResult,
  pendingResult,
  earlierResults,
  roster,
  seasonRecord,
} from '@/data/home'


// 맨 위 전체 화면: KGU 로고(히어로) → 카드들 (0페이지 배너는 2026-10-07 사용자 요청으로 삭제)
const SNAP_SCREENS = ['top']

export function HomePage() {
  const { away, cancel: cancelSnap } = useHeroSnap(SNAP_SCREENS)
  // 다른 페이지에서 '/#squad' 처럼 들어오면 그 구역으로
  useScrollToHash()

  return (
    <>
      <SiteBackground away={away} image={heroImage} />
      <DockNav items={navItems} heroId="top" logo={{ id: 'dock-logo' }} onNavigate={cancelSnap} pages={pageLinks} />
      <FloatingLogo
        src={heroLogo.src}
        darkSrc={heroLogo.darkSrc}
        alt={heroLogo.alt}
        heroId="top"
        asteriskHref="#notice"
        targetId="dock-logo"
        onNavigate={cancelSnap}
      />

      <PrismaHero
        id="top"
        bare
        title="KGU"
        logo={heroLogo}
        asteriskHref="#notice"
        outlineWord="TURTLES"
        scrollHint
      />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-2 p-2 pt-14 md:gap-3 md:p-3 md:pt-16">

        {/* 최근 결과 | 다음 경기 (첫 화면 바로 다음, 사용자 결정 2026-10-08) */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:gap-3 lg:grid-cols-2">
          {/* 최근 결과 */}
          <Reveal
            id="result"
            aria-labelledby="result-title"
            className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
          >
            <ResultSection
              result={recentResult}
              pending={pendingResult}
              earlier={earlierResults}
              record={seasonRecord}
              source={matchSource}
              titleId="result-title"
            />
          </Reveal>

          {/* 다음 경기 */}
          <Reveal
            id="next-match"
            delay={0.08}
            aria-labelledby="next-match-title"
            className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
          >
            <NextMatchSection match={nextMatch} later={laterMatches} titleId="next-match-title" now={pageOpenedAt} />
          </Reveal>
        </div>

        {/* 최신 소식 (결과·다음 경기 다음, 전체 폭 — 사용자 결정 2026-10-08) */}
        <Reveal
          id="news"
          aria-labelledby="news-title"
          className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
        >
          <NewsSection
            blog={news}
            magazine={magazine}
            titleId="news-title"
            blogHref={blogUrl}
            magazineHref={magazineUrl}
            youtubeHref={youtubeUrl}
            youtubeEmbed={youtubeLatestEmbed}
          />
        </Reveal>

        {/* 선수단 (전체 폭) */}
        <Reveal
          id="squad"
          aria-labelledby="squad-title"
          className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
        >
          <RosterSection
            players={roster.players}
            source={roster.source}
            updatedAt={roster.updatedAt}
            titleId="squad-title"
          />
        </Reveal>

        {/* 찾아오는 곳 (전체 폭, 맨 아래) */}
        <Reveal
          id="venue"
          aria-labelledby="venue-title"
          className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
        >
          <VenueSection titleId="venue-title" />
        </Reveal>
      </main>

      <SiteFooter />
    </>
  )
}
