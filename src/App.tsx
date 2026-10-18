/**
 * 페이지 목록 (2026-10-08 별도 페이지 구성으로 전환 — 사용자 선택)
 * - /          홈
 * - /schedule  경기 일정
 * - /records   시즌 기록
 * GitHub Pages 는 없는 주소를 404.html 로 보내므로 public/404.html 이 원래 주소를 기억해 index.html 로 넘기고,
 * main.tsx 가 그 주소로 되돌린다.
 */
import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'

// 홈만 첫 파일에 담고 나머지 페이지는 들어갈 때 불러옴 (2026-10-19 첫 파일 522KB → 분리)
// 관리자 화면도 따로 불러오므로 방문자는 Supabase 연결 코드를 받지 않음
const SchedulePage = lazy(() => import('@/pages/SchedulePage').then((m) => ({ default: m.SchedulePage })))
const RecordsPage = lazy(() => import('@/pages/RecordsPage').then((m) => ({ default: m.RecordsPage })))
const AdminPage = lazy(() => import('@/pages/AdminPage'))

const later = (page: ReactNode) => <Suspense fallback={null}>{page}</Suspense>

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/schedule" element={later(<SchedulePage />)} />
      <Route path="/records" element={later(<RecordsPage />)} />
      <Route path="/admin" element={later(<AdminPage />)} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
