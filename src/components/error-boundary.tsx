/**
 * 화면 오류 대비 (2026-10-20, 사용자 요청 "지금 바로 고쳐줘")
 * - 전에는 화면 코드 하나가 오류를 내면 사이트 전체가 하얀 빈 화면이 됐음
 * - 오류가 나면 다른 페이지와 같은 배경·카드·글꼴로 안내, 왼쪽 위 경기대 로고, '다시 불러오기'·'홈으로' 줄(글자 + 화살표 원)
 * - 2026-10-20 사용자 요청 "좌측 상단에 kgu로고, 폰트 신경쓰고, 색도 본 사이트랑 통일"
 * - 흔한 원인: 새로 배포된 뒤 열려 있던 창이 지워진 옛 페이지 파일(일정·기록·관리자)을 불러오려다 실패.
 *   그래서 버튼은 앱 안 이동이 아니라 새로고침(최신 파일을 받음)으로 처리
 * - 오류가 났을 수 있는 무거운 컴포넌트(배경 연출·메뉴 탭·움직임)는 쓰지 않고, 같은 모양을 직접 그림
 * - resetKey(지금 주소)가 바뀌면 오류 상태를 풀어, 다른 페이지로 가면 다시 정상 화면을 시도함
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ArrowRight, RotateCw } from 'lucide-react'
import { Eyebrow } from '@/components/eyebrow'
import { heroImage, heroLogo } from '@/data/home'

interface Props {
  children: ReactNode
  resetKey: string
}

interface State {
  error: Error | null
  key: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[화면 오류]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const home = import.meta.env.BASE_URL
    const row =
      'group flex w-full items-center justify-between gap-4 border-t border-line pt-4 text-left text-sm font-medium transition-colors hover:text-fg'
    const circle =
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line transition-colors duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent'
    return (
      <>
        {/* 다른 페이지와 같은 배경: 흐린 캠퍼스 사진 + 거북 등껍질 무늬 + 밝은 막 (움직임 컴포넌트 없이 그림) */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
          <picture>
            <source type="image/webp" srcSet={heroImage.webpSrcSet} sizes="100vw" />
            <img
              src={heroImage.src}
              srcSet={heroImage.jpgSrcSet}
              sizes="100vw"
              alt=""
              className="absolute inset-0 h-full w-full scale-125 object-cover object-[50%_55%] blur-[16px] grayscale-[0.6]"
            />
          </picture>
          <div className="shell-pattern absolute inset-0 opacity-[0.22]" />
          <div className="absolute inset-0 bg-[var(--veil)] opacity-[var(--veil-opacity)]" />
        </div>

        {/* 왼쪽 위 경기대 로고 (누르면 홈, 새로 불러옴) */}
        <a href={home} className="fixed left-4 top-4 z-10 md:left-6 md:top-5" aria-label="홈으로">
          <img src={heroLogo.darkSrc} alt={heroLogo.alt} className="w-10 md:w-14" />
        </a>

        <main className="mx-auto flex min-h-[70vh] max-w-[1440px] flex-col p-2 pt-20 md:p-3 md:pt-24">
          <section
            role="alert"
            aria-labelledby="error-title"
            className="rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10"
          >
            <div className="grid gap-10 md:grid-cols-12">
              <div className="flex flex-col gap-3 md:col-span-6">
                <Eyebrow>Error</Eyebrow>
                <h1 id="error-title" className="section-title text-4xl leading-[0.95] md:text-6xl">
                  화면을 불러오지 못했어요
                </h1>
                <p className="text-sm text-fg/60">
                  사이트가 방금 새로 반영됐거나 연결이 잠깐 끊겼을 수 있어요.
                  <br />
                  다시 불러오면 대부분 해결돼요.
                </p>
              </div>
              <div className="flex flex-col gap-4 md:col-span-6">
                <button type="button" onClick={() => window.location.reload()} className={row}>
                  다시 불러오기 — 지금 페이지를 새로 받아요
                  <span aria-hidden="true" className={circle}>
                    <RotateCw className="h-4 w-4" />
                  </span>
                </button>
                <a href={home} className={row}>
                  홈으로 — 최근 결과·다음 경기·소식·선수단
                  <span aria-hidden="true" className={circle}>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
              </div>
            </div>
          </section>
        </main>
      </>
    )
  }
}
