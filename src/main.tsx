import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/black-han-sans'
import '@fontsource/anton'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'

// 새로고침하면 브라우저가 이전 스크롤 위치로 돌아가 첫 화면 연출을 못 보게 되므로,
// 주소에 #구역이 없을 때는 항상 맨 위에서 시작
// GitHub Pages: /kgu_football/schedule 처럼 바로 들어오면 404.html 이 주소를 기억하고 첫 화면으로 보냄 → 원래 주소로 되돌림
try {
  const saved = sessionStorage.getItem('spa-redirect')
  if (saved) {
    sessionStorage.removeItem('spa-redirect')
    history.replaceState(null, '', saved)
  }
} catch {
  // 저장소를 못 쓰는 환경이면 첫 화면으로 둠
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
if (!location.hash) window.scrollTo(0, 0)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
