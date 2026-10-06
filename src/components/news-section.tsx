/**
 * 최신 소식 (impeccable polish)
 * - 첫 소식은 크게(요약 포함), 나머지는 오른쪽 목록
 * - 줄 전체가 링크, 마우스 올리면 줄이 살짝 밝아지고 화살표 원이 크림색으로 채워짐
 * - 바깥 링크는 새 창 + 화살표 방향(↗)으로 구분
 * - 소식이 없으면 빈 상태 안내
 * - 대표 사진이 있으면 대표 소식 왼쪽에 크게, 목록 줄 앞에 작게 (지금 소식에는 사진을 넣지 않음, 사용자 결정)
 */
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import type { NewsItem } from '@/data/home'

/** 원본 사이트에서 사진을 못 불러오면 빈 상자 대신 사진 칸을 숨김 */
const hideBrokenImage = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none'
}

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

export function NewsSection({
  items,
  titleId,
  moreHref,
  blogHref,
}: {
  items: NewsItem[]
  titleId: string
  moreHref: string
  blogHref?: string
}) {
  const [lead, ...rest] = items

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id={titleId}
          className="section-title text-4xl font-medium leading-[0.95] tracking-[-0.04em] md:text-6xl"
        >
          최신 소식
        </h2>
        <span className="flex gap-4">
          {blogHref && (
            <a
              {...linkProps(blogHref)}
              className="text-sm text-fg/70 underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
            >
              블로그
            </a>
          )}
          <a
            {...linkProps(moreHref)}
            className="text-sm text-fg/70 underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
          >
            인스타그램에서 더 보기
          </a>
        </span>
      </div>

      {!lead ? (
        <div className="flex flex-col items-start gap-4 border-t border-line pt-8">
          <p className="text-2xl font-medium">아직 올라온 소식이 없어요</p>
          <p className="text-fg/60">경기와 선수단 소식은 축구부 인스타그램에서 먼저 확인할 수 있어요.</p>
        </div>
      ) : (
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-12">
          {/* 대표 소식 */}
          <a
            {...linkProps(lead.href)}
            className="group -mx-3 flex flex-col justify-between gap-8 rounded-2xl p-3 transition-colors duration-300 hover:bg-fg/[0.04] lg:col-span-7"
          >
            <div className="flex flex-col gap-6 sm:flex-row">
            {lead.image && (
              <img
                src={lead.image}
                alt=""
                loading="lazy"
                onError={hideBrokenImage}
                className="aspect-[3/4] w-40 shrink-0 rounded-xl border border-line bg-crest object-cover transition-transform duration-500 ease-[var(--ease-pull)] group-hover:scale-[1.02] md:w-52"
              />
            )}
            <div className="flex flex-col gap-4">
              <Meta item={lead} />
              <p className="text-3xl font-medium leading-[1.15] tracking-[-0.03em] md:text-[2.75rem]">
                {lead.title}
              </p>
              {lead.summary && <p className="max-w-[46ch] text-base leading-relaxed text-fg/70">{lead.summary}</p>}
            </div>
            </div>
            <ArrowDot external={isExternal(lead.href)} large />
          </a>

          {/* 나머지 목록 */}
          {rest.length > 0 && (
            <ul className="flex flex-col lg:col-span-5">
              {rest.map((item) => (
                <li key={item.title} className="border-t border-line last:border-b">
                  <a
                    {...linkProps(item.href)}
                    className="group -mx-3 flex items-center justify-between gap-6 rounded-xl px-3 py-5 transition-colors duration-300 hover:bg-fg/[0.04]"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                onError={hideBrokenImage}
                        className="aspect-[3/4] w-12 shrink-0 rounded-md border border-line bg-crest object-cover"
                      />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-lg font-medium leading-snug">{item.title}</span>
                      <Meta item={item} />
                    </span>
                    <ArrowDot external={isExternal(item.href)} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
