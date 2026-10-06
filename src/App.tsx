import { DockNav } from '@/components/dock-nav'
import { FloatingLogo } from '@/components/floating-logo'
import { SiteBackground } from '@/components/site-background'
import { Reveal } from '@/components/motion'
import { ResultSection } from '@/components/result-section'
import { RosterSection } from '@/components/roster-section'
import { NewsSection } from '@/components/news-section'
import { NextMatchSection } from '@/components/next-match-section'
import { PrismaHero, type HeroNavItem } from '@/components/ui/prisma-hero'
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
  photoCredit,
  recentResult,
  earlierResults,
  roster,
  seasonRecord,
} from '@/data/home'

const navItems: HeroNavItem[] = [
  { label: '소식', href: '#news' },
  { label: '최근 결과', href: '#result' },
  { label: '다음 경기', href: '#next-match' },
  { label: '선수단', href: '#squad' },
]

// [시안 비교용, 임시] ?nav=1 위 전체 바 / 2 로고 받침 / 3 로고를 메뉴 탭 안에 / 4 왼쪽 세로 메뉴
const NAV = new URLSearchParams(location.search).get('nav')

export default function App() {
  const { away } = useHeroSnap('top')

  return (
    <>
      <SiteBackground away={away} image={heroImage} />
      <DockNav
        items={navItems}
        heroId="top"
        layout={NAV === '1' ? 'bar' : NAV === '4' ? 'vertical' : 'tab'}
        logo={NAV === '3' || NAV === '4' ? { src: heroLogo.darkSrc, alt: heroLogo.alt } : undefined}
      />
      <FloatingLogo
        src={heroLogo.src}
        darkSrc={heroLogo.darkSrc}
        alt={heroLogo.alt}
        heroId="top"
        asteriskHref="#notice"
        end={NAV === '1' ? 'bar' : NAV === '2' ? 'backed' : NAV === '3' || NAV === '4' ? 'hide' : 'float'}
      />

      <PrismaHero
        id="top"
        bare
        title="KGU"
        logo={heroLogo}
        navItems={navItems}
        asteriskHref="#notice"
      />

      <main className={`mx-auto flex max-w-[1440px] flex-col gap-2 p-2 pt-14 md:gap-3 md:p-3 md:pt-16 ${NAV === '4' ? 'pl-[140px] pt-2 md:pl-[170px] md:pt-3' : ''}`}>
        {/* 최신 소식 (맨 위, 전체 폭) */}
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

        <div className="grid gap-2 md:gap-3 lg:grid-cols-2">
          {/* 최근 결과 */}
          <Reveal
            id="result"
            aria-labelledby="result-title"
            className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
          >
            <ResultSection
              result={recentResult}
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
            <NextMatchSection match={nextMatch} later={laterMatches} titleId="next-match-title" />
          </Reveal>
        </div>

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
      </main>

      <footer
        id="notice"
        className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 pb-10 pt-8 text-sm text-fg/60 md:px-10"
      >
        <p className="text-fg">* 비공식 팬 사이트</p>
        <p>
          이 사이트는 개인 포트폴리오용으로 만든 비공식 팬 사이트이며, 경기대학교 및 경기대학교 축구부와 관련이
          없습니다.
        </p>
        <p>경기 일정·결과는 KUSF 대학스포츠, 선수 명단은 한국대학축구연맹(KUFC) 공개 자료를 참고했습니다.</p>
        <p className="text-xs text-fg/40">
          {photoCredit.label}{' '}
          <a href={photoCredit.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-fg/70">
            {photoCredit.url}
          </a>
        </p>
      </footer>
    </>
  )
}
