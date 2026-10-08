/**
 * 찾아오는 곳 (홈 맨 아래, 2026-10-08 사용자 결정)
 * - 홈 경기장 위치만: 오픈스트리트맵 지도(운동장에 핀) · 주소 · 주소 복사 · 지도 앱 버튼. 가는 길(교통편)은 넣지 않음
 * - 지도는 화면에 가까워질 때만 불러옴(loading=lazy)
 */
import { useState } from 'react'
import { Check, Copy, ExternalLink, MapPin } from 'lucide-react'
import { Eyebrow } from '@/components/eyebrow'
import { venue, venueCheckedAt, venueMap, venueSources } from '@/data/venue'

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

export function VenueSection({ titleId }: { titleId: string }) {
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
  const checked = `${Number(venueCheckedAt.slice(5, 7))}월 ${Number(venueCheckedAt.slice(8))}일`

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="flex flex-col gap-8 lg:col-span-4">
        <div className="flex flex-col gap-3">
          <Eyebrow>Home ground</Eyebrow>
          <h2 id={titleId} className="section-title text-4xl leading-[0.95] md:text-6xl">
            찾아오는 곳
          </h2>
          <p className="text-sm text-fg/60">홈 경기장 · {venue.name}</p>
        </div>

        <div className="flex flex-col gap-4 border-t border-line pt-5">
          <span className="flex items-center gap-1.5 text-sm text-fg/60">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {venue.campus}
          </span>
          <span className="text-lg font-medium leading-snug">{venue.address}</span>
          <button
            type="button"
            onClick={copy}
            className="flex h-9 w-fit items-center gap-1.5 rounded-full border border-line px-3 text-xs text-fg/80 transition-colors hover:border-accent"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            <span aria-live="polite">{copied ? '복사됨' : '주소 복사'}</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <span className="text-sm text-fg/60">지도 앱으로 보기</span>
          <div className="flex flex-wrap gap-2">
            <MapLink href={venueMap.kakao}>카카오맵</MapLink>
            <MapLink href={venueMap.naver}>네이버 지도</MapLink>
            <MapLink href={venueMap.osm}>오픈스트리트맵</MapLink>
          </div>
        </div>

      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper lg:col-span-8">
        <iframe
          title={`${venue.name} 위치 지도 (오픈스트리트맵)`}
          src={venueMap.embed}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="block aspect-[4/3] h-full w-full md:aspect-[16/9]"
        />
      </div>
      <p className="text-xs text-fg/60 lg:col-span-12">
        출처{' '}
        {venueSources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && ' · '}
            <a href={s.url} target="_blank" rel="noopener" className="tap-area underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg">
              {s.label}
            <span className="sr-only">(새 창)</span></a>
          </span>
        ))}
        {' · '}
        {checked} 확인
      </p>
    </div>
  )
}
