/**
 * 홈 '찾아오는 곳' 구역 데이터 (2026-10-08, 사용자 결정: 직관 가이드 페이지 대신 홈 맨 아래에 홈 경기장 위치만, 가는 길은 넣지 않음)
 * - 주소: 경기대학교 부설 평생교육원 '오시는 길' 공식 안내 (본교 '수원캠퍼스 찾아오기'는 robots.txt 가 자동 접근을 막아 같은 학교의 다른 공식 안내를 씀)
 * - 운동장 위치: 오픈스트리트맵(OSM) 지물 '운동장 #451564094'(경기대학교 안). 지도 © OpenStreetMap 기여자, ODbL
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

export const venueSources = [
  { label: '경기대학교 평생교육원 오시는 길', url: 'https://ssce.kyonggi.ac.kr/fro_end/html/dep_01/1400.php' },
  { label: '지도 © OpenStreetMap 기여자', url: 'https://www.openstreetmap.org/copyright' },
]
export const venueCheckedAt = '2026-10-08'
