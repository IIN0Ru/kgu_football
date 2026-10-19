/**
 * 화면 오류 대비 (2026-10-20, 사용자 요청 "지금 바로 고쳐줘")
 * - 전에는 화면 코드 하나가 오류를 내면 사이트 전체가 하얀 빈 화면이 됐음
 * - 오류가 나면 같은 색·카드 모양의 안내와 '다시 불러오기'·'홈으로'를 보여줌
 * - 흔한 원인: 새로 배포된 뒤 열려 있던 창이 지워진 옛 페이지 파일(일정·기록·관리자)을 불러오려다 실패.
 *   그래서 버튼은 앱 안 이동이 아니라 새로고침(최신 파일을 받음)으로 처리
 * - 이 안내 화면은 오류가 났을 수 있는 다른 컴포넌트(배경·메뉴·움직임)를 쓰지 않고 혼자 그림
 * - resetKey(지금 주소)가 바뀌면 오류 상태를 풀어, 다른 페이지로 가면 다시 정상 화면을 시도함
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper p-4">
        <div role="alert" className="flex w-full max-w-xl flex-col gap-6 rounded-2xl border border-line bg-crest p-6 md:rounded-[2rem] md:p-10">
          <p className="font-num text-[15px] uppercase tracking-[0.12em] text-accent">Error</p>
          <h1 className="section-title text-4xl leading-[0.95] md:text-5xl">화면을 불러오지 못했어요</h1>
          <p className="text-sm text-fg/60">
            사이트가 방금 새로 반영됐거나 연결이 잠깐 끊겼을 수 있어요. 다시 불러오면 대부분 해결돼요.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent"
            >
              다시 불러오기
            </button>
            <a href={home} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-fg/40">
              홈으로
            </a>
          </div>
        </div>
      </main>
    )
  }
}
