# 자료 출처와 사용 조건

이 문서는 기존 개발 기록의 출처·사용 조건을 모은 것이다. 허용 여부는 아래에 적힌 확인 시점의 기록이며, 새 자료를 추가하거나 수집 방식을 바꿀 때 다시 확인한다.

## 경기와 선수 정보

| 자료 | 출처 | 갱신 방식 |
|---|---|---|
| U리그 일정·결과 | [KUSF 대학스포츠](https://www.kusf.or.kr/league/league_schedule.html?e_code=45&l_year=2026&l_code=271&t_code=1704) | 사람이 확인해 `src/data/matches.json` 수정 |
| U리그 순위표·경기별 선수 기록 | 같은 KUSF 페이지의 경기기록(팀 기록·경기대 선수기록) | 사용자가 복사해 전달 → `src/data/records.json` (2026-10-08~) |
| 선수 명단 | [한국대학축구연맹(KUFC)](https://kufc.or.kr/teams/universities/cmpudexpx00055hfsejxuykvu) | 매주 월요일 한국 시간 03:00 자동 확인 |
| 블로그 | [경기대 축구부 블로그](https://blog.naver.com/orangeturtles) | 사용자가 제공한 주소·화면을 확인해 수동 반영 |
| 매거진 | [축구부 링크트리](https://linktr.ee/kgu_turtles) 및 개별 FlipHTML5 원문 | 수동 반영 |
| 유튜브 | [KGU TURTLES](https://www.youtube.com/@KGU_TURTLES) | 공식 업로드 재생목록을 iframe으로 표시 |

- 2026-10-06 조사 기록: KUFC 팀 페이지 수집은 robots.txt에서 허용, KUSF·링크트리·네이버 블로그 RSS는 자동 수집 금지로 판단해 수동 처리했다.
- 시즌 기록에 쓰는 선수 항목은 KUSF 공식 기록의 이름·등번호·득점·도움·경고·퇴장·명단 포함 경기 수뿐이다 (사용자 승인 2026-10-08). 다른 학교 선수 이름은 쓰지 않는다.
- 선수 공개 항목은 이름·번호·포지션·학년뿐이다. 사진·생년월·키·몸무게·출신교는 저장하거나 표시하지 않는다.
- 블로그는 제목·출처·게시일·원문 링크를 표시하며, 요약은 제공된 화면의 소개 문장을 참고했다. 확인하지 못한 날짜·요약은 지어내지 않는다.
- 유튜브 채널 ID: `UC4aARbVyxSRphfzcgx59BsQ`. 공식 플레이어는 `youtube-nocookie.com`을 사용한다.

## 캠퍼스 사진과 학교 로고

사용자가 2026-10-06 출처 표기 조건으로 사용 가능함을 확인한 자료다. 이 기록은 프로젝트 내 사용자 확인 사항이며 별도의 허가서가 저장돼 있다는 의미는 아니다.

- 캠퍼스 항공 사진: [경기대학교](https://www.kyonggi.ac.kr/). `public/images/campus-aerial-*`에 1200px·2000px JPG/WebP로 저장하고 푸터에 출처를 표시한다.
- 히어로 로고: 경기대학교 공식 UI(1947) 로고, 사용자 전달. `kgu-logo-1947.png`는 원본, `kgu-logo-1947-light.png`는 검은 글자만 크림색으로 바꾼 판이다. 색 테두리는 유지한다.
- 학교별 로고는 2026-10-06 공식 홈페이지에서 받았다. 각 로고 링크와 접근성 이름에 학교 홈페이지·출처를 표시한다.

| 학교 | 받은 곳 | 처리 |
|---|---|---|
| 경기대 | UI 페이지 kyonggi.ac.kr/www/contents.do?key=5093 의 `key5093_img01_.svg` | 원본 SVG 그대로 |
| 홍익대 | 심벌마크 페이지 hongik.ac.kr/kr/introduction/school-mark.do 의 `img-symbol@2x.png` | 256px WebP |
| 중앙대 | UI 페이지 cau.ac.kr/cms/FR_CON/index.do?MENU_ID=230 의 `ui1_a_1.png` (심볼 CAU) | 흰 배경 투명, 160px WebP |
| 성균관대 | 심볼마크 페이지 skku.edu/skku/about/symbol/symbol_01.do 의 JPG 다운로드(`jpg_1.zip` → SymbolMark.jpg) | 흰 배경 투명, 128px WebP |
| 용인대 | UI 페이지 yongin.ac.kr/cmn/sym/mnu/mpm/101050100/htmlMenuView.do 의 `simbol.png` | 색상표 빼고 심볼만, 128px WebP |
| 동원대 | 상징(UI) 페이지 tw.ac.kr/contents/contents.do?ciIdx=70&menuId=905 의 `ci_img1.png` | 96px WebP |
| 여주대 | CI 페이지 info.yit.ac.kr/ko/cms/CM_CN01_CON/index.do?MENU_SN=1924 의 `symbol1_b.png` | 크기 표시 빼고 심볼만, 96px WebP |
| 칼빈대 | UI 페이지 없음 → 홈페이지 calvin.ac.kr 상단 `h_logo.png` | 심볼 부분만(46×45 PNG, 작음) |

- 현재 파일과 학교 홈페이지 링크: `src/data/teams.ts`, `public/logos/`.
- 삭제된 블로그 배너는 2026-10-07 사용자 전달 자료로, 사용자가 축구부 허락과 출처 표기 조건을 확인했다. 현재 사이트에는 사용하지 않는다. 과거 사용 기록은 정리된 Git 이력에서 확인할 수 있다.

## 글꼴과 외부 코드

- Pretendard: `index.html`의 버전 고정 CDN stylesheet, SIL Open Font License 1.1.
- Black Han Sans·Anton: `@fontsource` 패키지로 제공, SIL Open Font License 1.1. 패키지의 라이선스 파일을 기준으로 한다.
- PrismaHero: 사용자가 전달한 21st.dev 컴포넌트를 수정해 사용한다. 원본의 정확한 배포 라이선스는 기존 기록에 명시돼 있지 않다. 확인 시 이 문서에 추가한다. 수정 내역은 `src/components/ui/prisma-hero.tsx` 머리말에 있다.
- impeccable: `pbakaus/impeccable`의 디자인·움직임 지침 참고, Apache-2.0. 기존 기록의 참고 버전은 v4.5.0, 커밋 `ece38d9`다. 도구 설치 실패 후 Claude 작업 환경에 복사해 사용했으며 이 저장소에 스킬 파일은 포함하지 않았다.
