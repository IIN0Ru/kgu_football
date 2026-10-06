/**
 * 학교 로고와 출처.
 * - 로고는 각 학교 공식 홈페이지의 UI(상징) 페이지에서 받은 것 (2026-10-06).
 *   사용자가 확인: 각 학교 모두 "출처 표기" 조건으로 사용 가능.
 * - 출처 표기: 로고에 마우스를 올리면 "출처 ○○대학교", 푸터에 학교별 공식 홈페이지 링크.
 * - 칼빈대는 UI 페이지가 없어 홈페이지 상단 로고(작은 이미지)의 심볼 부분만 사용.
 * - 경기대 로고는 원본 SVG 그대로, 나머지는 심볼만 잘라 흰 배경을 투명하게 바꾸고 웹용으로 줄임.
 * - 여기에 없는 팀은 이전처럼 이니셜 원으로 표시.
 */
const logo = (file: string) => `${import.meta.env.BASE_URL}logos/${file}`

export interface School {
  /** 경기 일정에 쓰는 짧은 이름 (예: 홍익대) */
  short: string
  /** 정식 이름 (출처 표기용) */
  name: string
  logo: string
  /** 출처로 적는 공식 홈페이지 */
  url: string
}

export const schools: School[] = [
  { short: '경기대', name: '경기대학교', logo: logo('kyonggi.svg'), url: 'https://www.kyonggi.ac.kr/' },
  { short: '동원대', name: '동원대학교', logo: logo('dongwon.webp'), url: 'https://www.tw.ac.kr/' },
  { short: '성균관대', name: '성균관대학교', logo: logo('skku.webp'), url: 'https://www.skku.edu/' },
  { short: '여주대', name: '여주대학교', logo: logo('yeoju.webp'), url: 'https://www.yit.ac.kr/' },
  { short: '용인대', name: '용인대학교', logo: logo('yongin.webp'), url: 'https://www.yongin.ac.kr/' },
  { short: '중앙대', name: '중앙대학교', logo: logo('cau.webp'), url: 'https://www.cau.ac.kr/' },
  { short: '칼빈대', name: '칼빈대학교', logo: logo('calvin.png'), url: 'http://www.calvin.ac.kr/' },
  { short: '홍익대', name: '홍익대학교', logo: logo('hongik.webp'), url: 'https://www.hongik.ac.kr/' },
]

export const schoolByShort = (short: string) => schools.find((s) => s.short === short)
