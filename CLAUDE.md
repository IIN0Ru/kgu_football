# kgu_football 프로젝트 지침

경기대학교 축구부 **비공식** 팬 홈페이지. 정적 사이트(HTML/CSS). AI 활용 개발로 진행하며 모든 변경은 `NOTES.md` 개발 로그에 기록한다.

## 디자인 기준

@DESIGN.md

- `DESIGN.md`는 GitHub `VoltAgent/awesome-design-md`(MIT, 커밋 `13be5c0`)의 `design-md/nike/DESIGN.md` 원본이다. 수정하지 않는다.
- 색, 글꼴 규칙, 간격, 모양, 컴포넌트는 `DESIGN.md`를 따른다. Nike 이름, 로고, 스우시, 문구는 쓰지 않는다.

## 이 프로젝트에서 바꿔 적용하는 부분

DESIGN.md를 그대로 못 쓰는 곳만 아래처럼 바꾼다. 여기 없는 건 DESIGN.md가 기준이다.

- **글꼴**: DESIGN.md의 대체 안내대로 `display-campaign`은 **Anton**(Google Fonts, 영문 대문자 전용). 한글이 들어가는 모든 글자는 **Pretendard**(Inter 대신, 한글 지원 때문). 굵기는 DESIGN.md 값(400/500) 그대로.
- **사진 없음**: 선수 사진·학교 자산을 쓰지 않으므로 `campaign-tile`은 사진 대신 `{colors.ink}` 배경 위에 display 문구를 얹는다. 실제 사진(직접 찍은 경기장 등)이 생기면 교체.
- **최소 글자 크기**: `utility-xs`(9px)는 한글 가독성 때문에 `caption-sm`(12px)으로 올려 쓴다.
- **경기 결과 색**: 승리 표시는 `{colors.success}`, 패배는 `{colors.mute}`. `{colors.sale}`(빨강)은 쓸 일이 없다.
- **모바일 메뉴**: DESIGN.md는 960px 이하 햄버거 드로어. 컴포넌트 출처(21st.dev 등)를 정하기 전까지는 가로 스크롤 메뉴로 둔다.

## 지킬 것

- 실제 정보가 없으면 지어내지 않고 "(예시)" 또는 "확인 중"으로 표시
- 선수 사진, 학교 로고, 실존 인물의 사적 정보는 쓰지 않음
- 코드를 바꾸면 `NOTES.md` 개발 로그를 같이 갱신해서 함께 커밋
