# kgu_football

경기대학교 축구부 **비공식** 팬 사이트 (개인 포트폴리오용).

## 개발 방식: AI 활용 개발

- **사용자**: 기획, 디자인 방향·컴포넌트 선택, 콘텐츠 제공, 결과 검수, AI 간 의견 조율
- **Claude**: 코드 작성, 화면 검증, 커밋
- **GPT**: 코드 리뷰
- 모든 결정과 변경 내역은 [NOTES.md](NOTES.md)의 개발 로그와 검토 기록에 남깁니다.

## 기술

- Vite, React, TypeScript, Tailwind CSS v4, framer-motion, lucide-react
- shadcn 구조(`src/components/ui`), 히어로는 21st.dev 컴포넌트를 수정해 사용
- GitHub Actions로 GitHub Pages 자동 배포

## 실행

```bash
npm install
npm run dev     # 개발 서버
npm run build   # 배포용 빌드 (dist/)
```

## 고지

선수 사진과 학교 로고는 사용하지 않으며, 공개된 기사와 대회 기록만 참고합니다. 경기대학교 및 경기대학교 축구부와 관련이 없습니다.
