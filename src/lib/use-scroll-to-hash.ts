/**
 * 다른 페이지에서 '/#squad' 처럼 홈의 구역으로 들어올 때, 그려진 뒤 그 구역으로 이동.
 * (페이지가 하나일 땐 브라우저가 알아서 했지만, 페이지 이동은 화면을 새로 그려서 직접 처리)
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useScrollToHash() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'auto' }), 50)
    return () => window.clearTimeout(t)
  }, [hash])
}
