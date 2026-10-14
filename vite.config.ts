import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 주소가 https://iin0ru.github.io/kgu_football/ 이므로 하위 경로 지정
  base: '/kgu_football/',
  plugins: [react(), tailwindcss()],
  build: {
    // 글꼴 조각은 CSS 안에 base64 로 넣지 않고 파일로 따로 둠: 브라우저가 화면에 쓰인 글자 조각만 받게
    // (UX 점검 2026-10-08: 72개 조각이 CSS 에 들어가 CSS 가 332KB, 첫 화면 표시가 늦어짐)
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  // 관리자 화면 로컬 시험(npm run dev:admin): /__local/rest/v1 → 로컬 PostgREST
  server: process.env.LOCAL_API
    ? { proxy: { '/__local/rest/v1': { target: process.env.LOCAL_API, rewrite: (p) => p.replace(/^\/__local\/rest\/v1/, '') } } }
    : undefined,
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
