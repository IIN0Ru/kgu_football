/** 사이트 공통 푸터: 비공식 안내(각주 `*` 의 도착 지점 #notice)와 자료·사진 출처 */
import { photoCredit } from '@/data/home'

export function SiteFooter() {
  return (
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
        <p className="text-xs text-fg/60">
          {photoCredit.label}{' '}
          <a href={photoCredit.url} target="_blank" rel="noopener" className="tap-area underline underline-offset-2 hover:text-fg/70">
            {photoCredit.url}
          <span className="sr-only">(새 창)</span></a>
        </p>
      </footer>
  )
}
