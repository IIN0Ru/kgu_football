import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/black-han-sans'
import '@fontsource/anton'
import './index.css'
import App from './App.tsx'

// 새로고침하면 브라우저가 이전 스크롤 위치로 돌아가 첫 화면 연출을 못 보게 되므로,
// 주소에 #구역이 없을 때는 항상 맨 위에서 시작
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
if (!location.hash) window.scrollTo(0, 0)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
