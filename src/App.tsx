/**
 * 페이지 목록 (2026-10-08 별도 페이지 구성으로 전환 — 사용자 선택)
 * - /          홈
 * - /schedule  경기 일정
 * - /records   시즌 기록
 * GitHub Pages 는 없는 주소를 404.html 로 보내므로 public/404.html 이 원래 주소를 기억해 index.html 로 넘기고,
 * main.tsx 가 그 주소로 되돌린다.
 */
import { Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { RecordsPage } from '@/pages/RecordsPage'
import { SchedulePage } from '@/pages/SchedulePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/records" element={<RecordsPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
