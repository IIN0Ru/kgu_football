# kgu_football 프로젝트 지침

경기대학교 축구부 **비공식** 팬 사이트. AI 활용 개발로 진행하며 모든 변경은 `NOTES.md` 개발 로그에 기록한다.

## 기술 스택

- Vite + React + TypeScript + Tailwind CSS v4
- shadcn 구조: 컴포넌트는 `src/components/ui/`, 경로 별칭 `@/` = `src/`, `components.json`, `src/lib/utils.ts`의 `cn()`
- 애니메이션 `framer-motion`, 아이콘 `lucide-react`
- 명령: `npm install` → `npm run dev`(개발) / `npm run build`(배포용 빌드)
- GitHub Pages 주소 하위 경로 때문에 `vite.config.ts`의 `base`는 `/kgu_football/`

## 디자인 기준

@DESIGN.md

- 색·글자·모양·움직임은 `DESIGN.md`를 따른다. 색은 `src/index.css`의 `@theme`에 정의된 이름(`fg`, `surface`, `bar`, `line`, `accent`, `on-accent`, `crest`, `win`, `on-win`, `paper`, 첫 화면 사진 위에서만 `cream`, `ink`, `primary`)만 쓴다.
- 히어로는 `src/components/ui/prisma-hero.tsx`(21st.dev 원본을 고친 것). 원본에서 바꾼 점은 파일 맨 위 주석에 적는다.

## 데이터

- 화면에 나오는 경기·소식 정보는 `src/data/`에 둔다. 화면 코드에 직접 쓰지 않는다 (나중에 API로 교체하기 쉽게).
- 실제 정보가 없으면 지어내지 않고 "(예시)" 또는 "확인 중"으로 표시

## 지킬 것

- 실존 인물의 사적 정보는 쓰지 않음. 선수 사진은 직접 올리지 않고, 축구부가 공개한 글(매거진·블로그)의 대표 사진만 원래 주소 그대로 불러와 원문 링크와 함께 표시 (사용자 결정 2026-10-06)
- 자동 수집은 robots.txt 가 허용하는 곳만 (KUFC 선수 명단). KUSF·링크트리·네이버 블로그 RSS는 막혀 있어 사람이 확인해 넣음
- 학교 로고는 학교 공식 홈페이지에서 받은 것만, 출처(학교 이름 + 공식 홈페이지)를 함께 표시 (사용자 확인: 출처 표기 조건으로 사용 가능, 2026-10-06)
- 영상·이미지는 사용 권한이 확인된 것만 쓰고, 출처와 라이선스를 NOTES.md에 기록
- 코드를 바꾸면 `npm run build`로 확인하고, `NOTES.md` 개발 로그를 같이 갱신해서 함께 커밋
