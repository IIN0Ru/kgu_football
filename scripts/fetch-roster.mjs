/**
 * 경기대 선수 명단을 한국대학축구연맹(KUFC) 공개 페이지에서 받아 src/data/roster.json 에 저장.
 * - KUFC robots.txt 가 /teams/universities 수집을 허용 (2026-10-06 확인)
 * - 개인정보 보호: 이름·번호·포지션·학년만 저장 (생년월·키·몸무게·출신교·사진은 버림, 사용자 결정 2026-10-06)
 * - 내용이 그대로면 파일을 건드리지 않음 (updatedAt 만 바뀌는 불필요한 커밋 방지)
 * - 실패하면 기존 파일을 그대로 두고 종료 코드 1 (사이트에는 이전 명단이 계속 보임)
 *
 * 실행: node scripts/fetch-roster.mjs
 */
import { realpathSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const PAGE_URL = 'https://kufc.or.kr/teams/universities/cmpudexpx00055hfsejxuykvu'
const OUT = new URL('../src/data/roster.json', import.meta.url)
const POSITIONS = new Set(['GK', 'DF', 'MF', 'FW'])

/** 페이지 HTML 안에 들어 있는 "players":[...] 배열을 찾아 JSON 으로 읽는다 */
export function parsePlayers(html) {
  const text = html.replace(/\\"/g, '"')
  const key = '"players":['
  const start = text.indexOf(key)
  if (start < 0) throw new Error('페이지에서 선수 목록(players)을 찾지 못함 — 사이트 구조가 바뀌었을 수 있음')
  let i = start + key.length - 1
  let depth = 0
  let inStr = false
  for (; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '[') depth++
    else if (c === ']' && --depth === 0) break
  }
  return JSON.parse(text.slice(start + key.length - 1, i + 1))
}

/** 공개할 항목만 남기고 번호순 정렬 */
export function pickPublic(players) {
  return players
    .filter((p) => typeof p.name === 'string' && POSITIONS.has(p.position))
    .map((p) => ({
      number: Number.isInteger(p.number) ? p.number : null,
      name: p.name,
      position: p.position,
      grade: Number.isInteger(p.grade) ? p.grade : null,
    }))
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
}

async function main() {
  const res = await fetch(PAGE_URL, {
    headers: { 'user-agent': 'kgu-football-fan-site (+https://github.com/IIN0Ru/kgu_football)' },
  })
  if (!res.ok) throw new Error(`KUFC 응답 ${res.status}`)
  const players = pickPublic(parsePlayers(await res.text()))
  if (players.length < 11) throw new Error(`선수가 ${players.length}명뿐 — 잘못 읽었을 가능성이 있어 저장하지 않음`)

  const prev = JSON.parse(await readFile(OUT, 'utf8'))
  if (JSON.stringify(prev.players) === JSON.stringify(players)) {
    console.log(`변경 없음 (${players.length}명)`)
    return
  }
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  await writeFile(OUT, JSON.stringify({ ...prev, updatedAt: today, players }, null, 2) + '\n')
  console.log(`명단 갱신: ${prev.players.length}명 → ${players.length}명`)
}

/**
 * 직접 실행했을 때만 수집 (다른 파일에서 import 하면 parsePlayers·pickPublic 만 쓰고 수집은 안 함).
 * 실행 경로를 운영체제에 맞는 file URL 로 바꿔 비교 — 예전의 `file://${경로}` 문자열 비교는
 * Windows 경로(C:\...)에서 'file:///C:/...' 와 달라 실행이 안 됐음 (리뷰 반영 2026-10-07).
 * 바로가기(심볼릭 링크)로 실행해도 맞도록 실제 경로로 바꾼 뒤 비교
 */
export function isDirectRun(metaUrl = import.meta.url, entry = process.argv[1]) {
  if (!entry) return false
  try {
    return metaUrl === pathToFileURL(realpathSync(entry)).href
  } catch {
    return false
  }
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
