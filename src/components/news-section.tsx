/**
 * 최신 소식 (impeccable polish)
 * - 두 칸: 왼쪽 "블로그"(가장 최근 글 크게 + 나머지 목록), 오른쪽 "유튜브 최신 영상"(공식 퍼가기 플레이어) + "매거진"(목록). 사용자 요청 2026-10-06
 * - 줄 전체가 링크, 마우스 올리면 줄이 살짝 밝아지고 화살표 원이 검정으로 채워짐
 * - 바깥 링크는 새 창 + 화살표 방향(↗)으로 구분
 * - 사진 없음 (사용자 결정). 소식이 없으면 빈 상태 안내
 */
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import type { NewsItem } from '@/data/home'

const isExternal = (href: string) => /^https?:\/\//.test(href)

function linkProps(href: string) {
  return isExternal(href) ? { href, target: '_blank', rel: 'noopener' } : { href }
}

function Meta({ item }: { item: NewsItem }) {
  const date = item.date?.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}.${Number(m)}.${Number(d)}`)
  const parts = [item.category, item.source, date].filter(Boolean)
  return <p className="text-sm text-fg/60">{parts.join(' · ')}</p>
}

function ArrowDot({ external, large }: { external: boolean; large?: boolean }) {
  const Icon = external ? ArrowUpRight : ArrowRight
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border border-line text-fg transition-colors duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent ${
        large ? 'h-12 w-12' : 'h-10 w-10'
      }`}
    >
      <Icon className={`${large ? 'h-5 w-5' : 'h-4 w-4'} transition-transform duration-300`} />
    </span>
  )
}

function Row({ item }: { item: NewsItem }) {
  return (
    <li className="border-t border-line last:border-b">
      <a
        {...linkProps(item.href)}
        className="group -mx-3 flex items-center justify-between gap-6 rounded-xl px-3 py-5 transition-colors duration-300 hover:bg-fg/[0.04]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-lg font-medium leading-snug">{item.title}</span>
          <Meta item={item} />
        </span>
        <ArrowDot external={isExternal(item.href)} />
      </a>
    </li>
  )
}

function ColumnHead({ label, href }: { label: string; href?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3 className="text-sm text-fg/60">{label}</h3>
      {href && (
        <a
          {...linkProps(href)}
          className="text-sm text-fg/60 underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
        >
          전체 보기
        </a>
      )}
    </div>
  )
}

export function NewsSection({
  blog,
  magazine,
  titleId,
  blogHref,
  magazineHref,
  youtubeHref,
  youtubeEmbed,
}: {
  blog: NewsItem[]
  magazine: NewsItem[]
  titleId: string
  blogHref?: string
  magazineHref?: string
  youtubeHref?: string
  /** 유튜브 최신 영상 퍼가기 주소 */
  youtubeEmbed?: string
}) {
  const [lead, ...rest] = blog

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id={titleId}
          className="section-title text-4xl font-medium leading-[0.95] tracking-[-0.04em] md:text-6xl"
        >
          최신 소식
        </h2>
      </div>

      {!lead && magazine.length === 0 ? (
        <div className="flex flex-col items-start gap-4 border-t border-line pt-8">
          <p className="text-2xl font-medium">아직 올라온 소식이 없어요</p>
          <p className="text-fg/60">경기와 선수단 소식은 축구부 블로그와 유튜브에서 먼저 확인할 수 있어요.</p>
        </div>
      ) : (
        <div className="grid gap-x-12 gap-y-12 lg:grid-cols-12">
          {/* 왼쪽: 블로그 */}
          <section aria-label="블로그" className="flex flex-col lg:col-span-7">
            <ColumnHead label="블로그" href={blogHref} />
            {lead && (
              <div className="border-t border-line pt-3">
              <a
                {...linkProps(lead.href)}
                className="group -mx-3 flex flex-col gap-6 rounded-2xl p-3 transition-colors duration-300 hover:bg-fg/[0.04]"
              >
                <div className="flex flex-col gap-4">
                  <Meta item={lead} />
                  <p className="text-2xl font-medium leading-[1.2] tracking-[-0.03em] md:text-[2.25rem]">
                    {lead.title}
                  </p>
                  {lead.summary && (
                    <p className="max-w-[52ch] text-base leading-relaxed text-fg/70">{lead.summary}</p>
                  )}
                </div>
                <ArrowDot external={isExternal(lead.href)} large />
              </a>
              </div>
            )}
            {rest.length > 0 && (
              <ul className="mt-4">
                {rest.map((item) => (
                  <Row key={item.href} item={item} />
                ))}
              </ul>
            )}
          </section>

          {/* 오른쪽: 유튜브 최신 영상 + 매거진 */}
          <div className="flex flex-col gap-12 lg:col-span-5">
            {youtubeEmbed && (
              <section aria-label="유튜브 최신 영상" className="flex flex-col">
                <ColumnHead label="유튜브 최신 영상" href={youtubeHref} />
                <div className="overflow-hidden rounded-2xl border border-line bg-ink">
                  <iframe
                    src={youtubeEmbed}
                    title="경기대학교 축구부 유튜브 최신 영상"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="aspect-video w-full"
                  />
                </div>
              </section>
            )}
            {magazine.length > 0 && (
              <section aria-label="매거진" className="flex flex-col">
                <ColumnHead label="매거진" href={magazineHref} />
                <ul>
                  {magazine.map((item) => (
                    <Row key={item.href} item={item} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
