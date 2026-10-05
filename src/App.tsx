import { ArrowRight } from 'lucide-react'
import { DockNav } from '@/components/dock-nav'
import { Reveal, RollingNumber } from '@/components/motion'
import { PrismaHero, type HeroNavItem } from '@/components/ui/prisma-hero'
import { useHeroSnap } from '@/components/use-hero-snap'
import { instagramUrl, news, nextMatch, recentResult } from '@/data/home'

const navItems: HeroNavItem[] = [
  { label: '다음 경기', href: '#next-match' },
  { label: '최근 결과', href: '#result' },
  { label: '소식', href: '#news' },
  { label: '인스타그램', href: instagramUrl },
]

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="section-title text-4xl font-medium leading-[0.95] tracking-[-0.04em] md:text-6xl">
      {children}
    </h2>
  )
}

function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-2 self-start rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base"
    >
      {children}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
        <ArrowRight className="h-4 w-4 text-cream" aria-hidden="true" />
      </span>
    </a>
  )
}

export default function App() {
  const won = recentResult.home.score > recentResult.away.score
  const { away, goNext } = useHeroSnap('top')

  return (
    <>
      <DockNav items={navItems} heroId="top" />

      <PrismaHero
        id="top"
        away={away}
        onCtaClick={goNext}
        title="KGU"
        description="경기대학교 축구부의 경기 일정과 결과, 소식을 한곳에 모아 보는 비공식 팬 사이트입니다."
        ctaLabel="다음 경기 보기"
        ctaHref="#next-match"
        navItems={navItems}
        asteriskHref="#notice"
      />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-2 p-2 md:gap-3 md:p-3">
        {/* 다음 경기 */}
        <Reveal
          id="next-match"
          aria-labelledby="next-match-title"
          className="flex flex-col gap-10 rounded-2xl bg-panel p-6 md:rounded-[2rem] md:p-10"
        >
          <SectionTitle id="next-match-title">다음 경기</SectionTitle>
          <div className="grid grid-cols-12 items-end gap-6">
            <div className="col-span-12 flex flex-col gap-3 lg:col-span-8">
              <p className="text-sm text-cream/60">{nextMatch.competition}</p>
              <p className="text-3xl font-medium tracking-[-0.03em] md:text-5xl">
                {nextMatch.home} <span className="text-cream/40">vs</span> {nextMatch.away}
              </p>
              <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-cream/60">일시</dt>
                  <dd>{nextMatch.date}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-cream/60">장소</dt>
                  <dd>{nextMatch.venue}</dd>
                </div>
              </dl>
            </div>
            <div className="col-span-12 flex lg:col-span-4 lg:justify-end">
              <PillLink href={instagramUrl}>축구부 소식 확인</PillLink>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-2 md:gap-3 lg:grid-cols-2">
          {/* 최근 결과 */}
          <Reveal
            id="result"
            aria-labelledby="result-title"
            className="flex flex-col gap-10 rounded-2xl bg-panel p-6 md:rounded-[2rem] md:p-10"
          >
            <SectionTitle id="result-title">최근 결과</SectionTitle>
            <div className="flex flex-col">
              <p className="mb-3 text-sm text-cream/60">{recentResult.competition}</p>
              {[recentResult.home, recentResult.away].map((team, i) => (
                <div
                  key={team.name}
                  className="flex items-baseline justify-between border-t border-line py-4"
                >
                  <span className={`text-2xl font-medium ${i === 1 ? 'text-cream/50' : ''}`}>
                    {team.name}
                  </span>
                  <span
                    className={`text-6xl font-medium leading-none tracking-[-0.05em] md:text-7xl ${
                      i === 1 ? 'text-cream/50' : ''
                    }`}
                  >
                    <RollingNumber value={team.score} delay={0.3 + i * 0.15} />
                  </span>
                </div>
              ))}
              <p className={`border-t border-line pt-4 text-sm font-medium ${won ? 'text-win' : 'text-cream/60'}`}>
                {won ? '승리' : '경기 종료'}
              </p>
            </div>
          </Reveal>

          {/* 최신 소식 */}
          <Reveal
            id="news"
            delay={0.08}
            aria-labelledby="news-title"
            className="flex flex-col gap-10 rounded-2xl bg-panel p-6 md:rounded-[2rem] md:p-10"
          >
            <SectionTitle id="news-title">최신 소식</SectionTitle>
            <ul className="flex flex-col">
              {news.map((item) => (
                <li key={item.title} className="border-t border-line last:border-b">
                  <a
                    href={item.href}
                    className="group flex items-center justify-between py-5 text-lg font-medium transition-colors hover:text-cream/70"
                  >
                    {item.title}
                    <ArrowRight
                      className="h-5 w-5 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
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
      </footer>
    </>
  )
}
