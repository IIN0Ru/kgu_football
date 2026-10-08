# KGU Football

경기대학교 축구부의 경기 일정·결과·선수단·소식을 한곳에서 볼 수 있는 **비공식 팬 사이트**다. AI를 활용해 제작한 개인 포트폴리오 프로젝트다.

[사이트 보기](https://iin0ru.github.io/kgu_football/)

## 주요 기능

- 최근 5경기 결과와 시즌 승무패·득실점 집계
- 한국 시간 기준 다음 경기·D-day·이후 경기 표시
- 포지션별 선수 명단과 주 1회 자동 갱신
- 축구부 블로그·매거진 링크와 유튜브 플레이어
- 경기 일정 페이지: 달별 목록, 남은·끝난·홈·원정 거르기, 구글 캘린더·.ics 로 일정 넣기
- 스크롤에 반응하는 학교 로고·고정 메뉴·카드 등장 효과
- 동작 줄이기 설정과 키보드 접근 지원

현재는 홈과 경기 일정 두 페이지로 구성된 프론트엔드 사이트이며 서버·DB·관리자 페이지는 없다.

## 기술

React 19, TypeScript, Vite, Tailwind CSS v4, react-router, framer-motion, lucide-react.
shadcn 호환 경로 구조와 `cn()` 유틸리티를 사용하며, 히어로는 전달받은 21st.dev PrismaHero를 수정했다.

## 실행과 검증

GitHub Actions와 동일한 Node.js 22 최신 패치 버전을 권장한다.

```bash
npm ci
npm run dev
npm run build
npm run lint
npm run check:time
npm run check:calendar
```

- `npm run preview`: 빌드 결과 미리보기.
- `main`에 push하면 GitHub Actions가 빌드해 `gh-pages` 브랜치로 배포한다.
- GitHub Pages 하위 경로 때문에 Vite의 `base`는 `/kgu_football/`이다.

## 데이터 관리

| 내용 | 파일 | 갱신 방식 |
|---|---|---|
| 경기 일정·결과 | `src/data/matches.json` | KUSF 자료 수동 확인 |
| 선수 명단 | `src/data/roster.json` | KUFC 자료 매주 월요일 한국 시간 03:00 확인 |
| 블로그·매거진·채널 | `src/data/home.ts` | 소식 수동 반영, 유튜브 공식 플레이어 사용 |
| 학교 로고·링크 | `src/data/teams.ts` | 공식 출처 확인 후 반영 |

다음 경기와 D-day는 페이지를 연 시각을 기준으로 계산한다. 경기 결과는 사람이 입력해야 하며, 명단 수집에 실패하면 기존 데이터를 유지한다.

## 문서와 개발 방식

- [개발 지침](CLAUDE.md): 작업 규칙과 검증 절차
- [디자인 기준](DESIGN.md): 현재 확정된 화면과 움직임
- [프로젝트 노트](NOTES.md): 현재 상태·남은 작업·주요 변경·검토 기록
- [자료 출처](docs/SOURCES.md): 원문 링크와 사용 조건

사용자는 기획·콘텐츠·검수를, Claude는 구현을, GPT는 코드 리뷰를 담당한다.

## 고지

경기대학교 및 경기대학교 축구부와 관련이 없는 비공식 사이트다. 자료 출처와 사용 조건은 위 출처 문서에 기록한다.
