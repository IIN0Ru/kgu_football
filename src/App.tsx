import { DockNav } from '@/components/dock-nav'
import { SiteBackground } from '@/components/site-background'
import { Reveal, RollingNumber } from '@/components/motion'
import { NewsSection } from '@/components/news-section'
import { NextMatchSection } from '@/components/next-match-section'
import { PrismaHero, type HeroNavItem } from '@/components/ui/prisma-hero'
import { useHeroSnap } from '@/components/use-hero-snap'
import {
  heroImage,
  instagramUrl,
  matchSource,
  news,
  nextMatch,
  ourTeam,
  photoCredit,
  recentResult,
} from '@/data/home'

const navItems: HeroNavItem[] = [
  { label: '소식', href: '#news' },
  { label: '최근 결과', href: '#result' },
  { label: '다음 경기', href: '#next-match' },
  { label: '인스타그램', href: instagramUrl },
]

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="section-title text-4xl font-medium leading-[0.95] tracking-[-0.04em] md:text-6xl">
      {children}
    </h2>
  )
}

export default function App() {
  const [ours, theirs] =
    recentResult.home.name === ourTeam
      ? [recentResult.home.score, recentResult.away.score]
      : [recentResult.away.score, recentResult.home.score]
  const result = ours > theirs ? '승리' : ours < theirs ? '패배' : '무승부'
  const { away, goNext } = useHeroSnap('top')

  return (
    <>
      <SiteBackground away={away} image={heroImage} />
      <DockNav items={navItems} heroId="top" />

      <PrismaHero
        id="top"
        bare
        onCtaClick={goNext}
        title="KGU"
        description="경기대학교 축구부의 경기 일정과 결과, 소식을 한곳에 모아 보는 비공식 팬 사이트입니다."
        ctaLabel="최신 소식 보기"
        ctaHref="#news"
        navItems={navItems}
        asteriskHref="#notice"
      />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-2 p-2 pt-14 md:gap-3 md:p-3 md:pt-16">
        {/* 최신 소식 (맨 위, 전체 폭) */}
        <Reveal
          id="news"
          aria-labelledby="news-title"
          className="rounded-2xl bg-panel/70 p-6 md:rounded-[2rem] md:p-10"
        >
          <NewsSection items={news} titleId="news-title" moreHref={instagramUrl} />
        </Reveal>

        <div className="grid gap-2 md:gap-3 lg:grid-cols-2">
          {/* 최근 결과 */}
          <Reveal
            id="result"
            aria-labelledby="result-title"
            className="flex flex-col gap-10 rounded-2xl bg-panel/70 p-6 md:rounded-[2rem] md:p-10"
          >
            <SectionTitle id="result-title">최근 결과</SectionTitle>
            <div className="flex flex-col">
              <p className="mb-3 text-sm text-cream/60">
                {[recentResult.competition, recentResult.date, recentResult.venue].join(' · ')}
              </p>
              {[recentResult.home, recentResult.away].map((team, i) => {
                const muted = team.name !== ourTeam
                return (
                  <div
                    key={team.name}
                    className="flex items-baseline justify-between border-t border-line py-4"
                  >
                    <span className={`text-2xl font-medium ${muted ? 'text-cream/50' : ''}`}>{team.name}</span>
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
              <div className="flex items-center justify-between gap-4 border-t border-line pt-4 text-sm">
                <span className={`font-medium ${result === '승리' ? 'text-win' : 'text-cream/60'}`}>{result}</span>
                <a
                  href={matchSource.url}
                  target="_blank"
                  rel="noopener"
                  className="text-cream/60 underline decoration-cream/30 underline-offset-4 transition-colors hover:text-cream"
                >
                  출처 {matchSource.label}
                </a>
              </div>
            </div>
          </Reveal>

          {/* 다음 경기 */}
          <Reveal
            id="next-match"
            delay={0.08}
            aria-labelledby="next-match-title"
            className="rounded-2xl bg-panel/70 p-6 md:rounded-[2rem] md:p-10"
          >
            <NextMatchSection match={nextMatch} titleId="next-match-title" ctaHref={instagramUrl} />
          </Reveal>
        </div>
      </main>

      <footer
        id="notice"
        className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 pb-10 pt-8 text-sm text-cream/60 md:px-10"
      >
        <p className="text-cream">* 비공식 팬 사이트</p>
        <p>
          이 사이트는 개인 포트폴리오용으로 만든 비공식 팬 사이트이며, 경기대학교 및 경기대학교 축구부와 관련이
          없습니다.
        </p>
        <p>경기 정보는 공개된 기사와 대회 기록을 참고했습니다.</p>
        <p className="text-xs text-cream/40">
          {photoCredit.label}{' '}
          <a href={photoCredit.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-cream/70">
            {photoCredit.url}
          </a>
        </p>
      </footer>
    </>
  )
}
