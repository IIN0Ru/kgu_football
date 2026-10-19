/**
 * 없는 주소 페이지 (2026-10-20, 사용자 요청 "지금 바로 고쳐줘")
 * - 전에는 없는 주소도 홈을 보여줘서, 주소를 잘못 친 건지 알 수 없었음
 * - 다른 페이지와 같은 배경·탭·카드·푸터. 카드 안에 'Not found' 머리말, 제목, 입력한 주소, 갈 수 있는 페이지 목록
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { DockNav } from '@/components/dock-nav'
import { Eyebrow } from '@/components/eyebrow'
import { Reveal } from '@/components/motion'
import { PageLinkRow } from '@/components/page-link-row'
import { SiteBackground } from '@/components/site-background'
import { SiteFooter } from '@/components/site-footer'
import { heroImage, heroLogo } from '@/data/home'
import { navItems, pageLinks } from '@/data/nav'

export function NotFoundPage() {
  const { pathname } = useLocation()

  useEffect(() => {
    const before = document.title
    document.title = '페이지를 찾을 수 없음 | KGU Football'
    return () => {
      document.title = before
    }
  }, [])

  return (
    <>
      <SiteBackground away image={heroImage} />
      <DockNav
        items={navItems}
        staticLogo={{ src: heroLogo.darkSrc, alt: heroLogo.alt }}
        pageTitle="없는 페이지"
        pages={pageLinks}
      />

      <main className="mx-auto flex min-h-[70vh] max-w-[1440px] flex-col gap-2 p-2 pt-16 md:gap-3 md:p-3 md:pt-20">
        <Reveal
          aria-labelledby="not-found-title"
          className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
        >
          <div className="grid gap-10 md:grid-cols-12">
            <div className="flex flex-col gap-3 md:col-span-6">
              <Eyebrow>Not found · 404</Eyebrow>
              <h1 id="not-found-title" className="section-title text-4xl leading-[0.95] md:text-6xl">
                페이지를 찾을 수 없어요
              </h1>
              <p className="text-sm text-fg/60">
                주소가 바뀌었거나 잘못 입력됐을 수 있어요.
                <br />
                입력한 주소: <span className="break-all font-medium text-fg">{pathname}</span>
              </p>
            </div>

            <nav aria-label="갈 수 있는 페이지" className="flex flex-col gap-4 md:col-span-6">
              {pageLinks.map((p) => (
                <PageLinkRow key={p.href} to={p.href}>
                  {`${p.label} — ${p.description}`}
                </PageLinkRow>
              ))}
            </nav>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </>
  )
}
