/**
 * 직관 가이드 데이터 (2026-10-08, 홈 경기장만 — 사용자 결정)
 * - 주소·교통: 경기대학교 부설 평생교육원 '오시는 길' 공식 안내 (본교 '수원캠퍼스 찾아오기'는 robots.txt 가 자동 접근을 막아 같은 학교의 다른 공식 안내를 씀)
 * - 운동장 위치: 오픈스트리트맵(OSM) 지물 '운동장 #451564094'(경기대학교 안). 지도 © OpenStreetMap 기여자, ODbL
 * - 공식 자료에 없는 것(주차, 관중석, 입장료, 캠퍼스 안 가까운 문)은 지어내지 않고 '확인 중' (사용자 결정: 공식 자료만)
 */

export const venue = {
  name: '경기대 대운동장',
  campus: '경기대학교 수원캠퍼스',
  address: '경기도 수원시 영통구 광교산로 154-42',
  /** OSM 운동장 지물 안의 한 점 */
  lat: 37.29976,
  lon: 127.03525,
}

const q = encodeURIComponent('경기대학교 수원캠퍼스')
const d = 0.0045 // 지도 범위(경도), 위도는 약 0.6배
export const venueMap = {
  embed: `https://www.openstreetmap.org/export/embed.html?bbox=${venue.lon - d},${venue.lat - d * 0.6},${venue.lon + d},${venue.lat + d * 0.6}&layer=mapnik&marker=${venue.lat},${venue.lon}`,
  osm: `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lon}#map=17/${venue.lat}/${venue.lon}`,
  kakao: `https://map.kakao.com/link/map/${encodeURIComponent(venue.name)},${venue.lat},${venue.lon}`,
  naver: `https://map.naver.com/p/search/${q}`,
}

export interface RouteGroup {
  title: string
  /** 내리는 곳 */
  stop?: string
  lines: string[]
}

export const subway: { line: string; text: string }[] = [
  { line: '신분당선', text: '광교(경기대)역' },
  { line: '1호선', text: '수원역에서 경기대행 버스로 갈아타고 경기대입구 하차' },
]

export const buses: RouteGroup[] = [
  {
    title: '수원 근교 → 정문',
    stop: '연무동 종점 (01-200)',
    lines: ['7-1', '11', '16', '16-1', '16-2', '20-1', '25-1', '26', '32-1', '32-2', '32-5', '35', '37', '45', '46', '50-2~50-6', '58'],
  },
  { title: '수원 근교 → 정문', stop: '광교산 입구 (01-204)', lines: ['13', '13-3'] },
  {
    title: '수원 근교 → 후문·수원박물관',
    stop: '04-181',
    lines: ['7', '7-2', '47', '60', '80', '82', '400-4', '660', '700-2', '720-1', '730'],
  },
  { title: '수원 근교 → 후문', stop: '04-184', lines: ['47', '82', '400', '500', '670'] },
  {
    title: '서울 방면 직행',
    stop: '후문·수원박물관',
    lines: ['1007', '1007-1', '3007', '4000', '7000', '7001', '8800', 'M5115', 'M5414'],
  },
]

export const driving: string[] = [
  '경부고속도로: 신갈IC → 영동고속도로(인천·안산 방면) → 동수원IC에서 약 1분',
  '용서고속도로: 광교상현IC에서 수원 방면 약 3분',
  '경수산업도로: 경기도교육청 사거리에서 경기대 방면 약 3분',
]

/** 공식 자료에서 확인하지 못한 항목 */
export const unknowns: { label: string; value: string }[] = [
  { label: '주차', value: '확인 중' },
  { label: '관중석·입장', value: '확인 중' },
  { label: '가까운 출입문', value: '확인 중' },
]

export const guideSources = [
  { label: '경기대학교 평생교육원 오시는 길', url: 'https://ssce.kyonggi.ac.kr/fro_end/html/dep_01/1400.php' },
  { label: '지도 © OpenStreetMap 기여자', url: 'https://www.openstreetmap.org/copyright' },
]
export const guideCheckedAt = '2026-10-08'
