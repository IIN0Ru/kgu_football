/**
 * 다른 페이지에서 '/#squad' 처럼 홈의 구역으로 들어올 때, 그려진 뒤 그 구역으로 이동.
 * (페이지가 하나일 땐 브라우저가 알아서 했지만, 페이지 이동은 화면을 새로 그려서 직접 처리)
 * 2026-10-08 버그 수정: 주소에 #구역이 없으면 그리기 전에 맨 위로. 다른 페이지에서 내려간 스크롤 위치가
 * 그대로 남아 홈이 중간(첫 화면 넘김·로고 이동 도중 상태)에서 열리던 문제 (사용자 제보)
 */
import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useScrollToHash() {
  const { hash } = useLocation()
  // 페이지에 들어온 순간 한 번만 (같은 페이지 안 구역 이동에는 관여하지 않음)
  useLayoutEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'auto' }), 50)
    return () => window.clearTimeout(t)
  }, [hash])
}
