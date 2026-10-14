/**
 * KUSF 표 붙여넣기 읽기 (관리자 화면, 2026-10-14)
 * - 웹 표를 복사하면 보통 칸은 탭, 줄은 줄바꿈으로 들어온다. 탭이 없으면 두 칸 이상 공백, 그래도 없으면 공백으로 나눈다
 * - 첫 줄(머리줄)의 이름으로 칸 위치를 찾는다 → KUSF 표의 칸 순서가 바뀌어도 읽힘. 머리줄이 없으면 읽지 않음(엉뚱한 칸을 득점으로 넣지 않게)
 * - 읽지 못한 줄은 버리지 않고 몇 번째 줄인지·이유와 함께 돌려준다
 */

export interface LineError {
  line: number // 붙여넣은 글의 몇 번째 줄 (1부터)
  text: string
  reason: string
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()

function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
  if (/\S {2,}\S/.test(line)) return line.trim().split(/ {2,}/).map((c) => c.trim())
  return line.trim().split(/\s+/)
}

/** 머리줄에서 각 항목의 칸 위치 찾기. names: 같은 뜻의 여러 이름 */
function findColumns<K extends string>(header: string[], want: Record<K, string[]>) {
  const cols = {} as Record<K, number>
  const h = header.map(norm)
  for (const key of Object.keys(want) as K[]) {
    cols[key] = h.findIndex((c) => want[key].some((n) => c === norm(n)))
  }
  return cols
}

const INT = /^-?\d+$/
function num(cells: string[], i: number, fallback: number | null = 0): number | null {
  if (i < 0) return fallback
  const v = (cells[i] ?? '').trim().replace(/위$/, '') // 순위 '1위'
  if (v === '' || v === '-' || v === '–') return fallback
  return INT.test(v) ? Number(v) : NaN
}

/** '홍길동(경기대)' → 학교, '박준원(3)' → 등번호 (KUSF 경기 기록은 괄호에 등번호) */
export function splitSchool(raw: string): { name: string; school: string | null; number: number | null } {
  const m = raw.trim().match(/^(.+?)\s*\((.+)\)$/)
  if (!m) return { name: raw.trim(), school: null, number: null }
  const inner = m[2].trim()
  return /^\d{1,2}$/.test(inner) ? { name: m[1].trim(), school: null, number: Number(inner) } : { name: m[1].trim(), school: inner, number: null }
}

/** 학교 이름 맞추기: '경기대학교' · '경기 대' · '경기대' → '경기대' */
export const schoolKey = (s: string) => norm(s).replace(/대학교$/, '대').replace(/학교$/, '')

// ---------------------------------------------------------------- 선수 기록

export interface PlayerLine {
  line: number
  number: number | null
  name: string
  goals: number
  assists: number
  yellow: number
  red: number
}

export interface PlayerParse {
  rows: PlayerLine[]
  errors: LineError[]
  skipped: LineError[] // 다른 학교 선수 등 일부러 뺀 줄
  missingColumns: string[] // 머리줄에 없어서 0으로 둔 항목
  headerFound: boolean
}

const PLAYER_COLS = {
  number: ['등번호', '번호', 'No', 'No.', '배번'],
  name: ['선수명', '이름', '성명', '선수'],
  goals: ['득점', '골'],
  assists: ['도움', '어시스트', '도움주기'],
  yellow: ['경고', '옐로카드', '옐로'],
  red: ['퇴장', '레드카드', '레드'],
}

/**
 * KUSF '경기대 선수기록'을 복사하면 이름 칸과 숫자 칸이 따로 붙어 나온다 (2026-10-14 실제 붙여넣기로 확인):
 *   선수명 / 박준원(3) / 황병석(4) … (한 줄에 한 명)  →  득점 도움 경고 퇴장 / 0 0 0 0 … (같은 순서)
 * 이런 '세로 묶음'이면 이름 줄과 숫자 줄을 순서대로 짝지어 보통 표처럼 만든다. 개수가 다르면 읽지 않음
 */
function blockToRows(lines: string[]): { header: string[]; rows: { line: number; raw: string; cells: string[] }[]; error?: string } | null {
  const isName = (l: string) => findColumns(splitRow(l), PLAYER_COLS).name >= 0 && splitRow(l).length === 1
  const nameAt = lines.findIndex(isName)
  if (nameAt < 0) return null
  const statAt = lines.findIndex((l, i) => i > nameAt && findColumns(splitRow(l), PLAYER_COLS).goals >= 0)
  if (statAt < 0) return null
  const names = lines.slice(nameAt + 1, statAt).map((l, i) => ({ line: nameAt + 2 + i, text: l.trim() })).filter((x) => x.text)
  const stats = lines.slice(statAt + 1).map((l, i) => ({ line: statAt + 2 + i, text: l })).filter((x) => x.text.trim())
  const header = [splitRow(lines[nameAt])[0], ...splitRow(lines[statAt])]
  if (names.length !== stats.length) {
    return { header, rows: [], error: `선수 이름은 ${names.length}명인데 숫자 줄은 ${stats.length}줄이에요. 표를 처음부터 끝까지 다시 복사해 주세요` }
  }
  return {
    header,
    rows: names.map((n, i) => ({ line: stats[i].line, raw: `${n.text}\t${stats[i].text.trim()}`, cells: [n.text, ...splitRow(stats[i].text)] })),
  }
}

export function parsePlayers(text: string, ourSchool = '경기대'): PlayerParse {
  const lines = text.split(/\r?\n/)
  const res: PlayerParse = { rows: [], errors: [], skipped: [], missingColumns: [], headerFound: false }

  // 1) 한 줄에 머리줄 전체가 있는 보통 표  2) 이름·숫자가 따로 붙은 KUSF 세로 묶음
  let header: string[] | null = null
  let rows: { line: number; raw: string; cells: string[] }[] = []
  const headerAt = lines.findIndex((l) => {
    const c = findColumns(splitRow(l), PLAYER_COLS)
    return c.name >= 0 && c.goals >= 0
  })
  if (headerAt >= 0) {
    header = splitRow(lines[headerAt])
    rows = lines.slice(headerAt + 1).map((l, i) => ({ line: headerAt + 2 + i, raw: l, cells: splitRow(l) }))
  } else {
    const block = blockToRows(lines)
    if (block) {
      header = block.header
      rows = block.rows
      if (block.error) {
        res.headerFound = true
        res.errors.push({ line: 1, text: '', reason: block.error })
        return res
      }
    }
  }
  if (!header) return res
  const cols = findColumns(header, PLAYER_COLS)
  res.headerFound = true
  res.missingColumns = (['assists', 'yellow', 'red'] as const).filter((k) => cols[k] < 0).map((k) => ({ assists: '도움', yellow: '경고', red: '퇴장' })[k])

  for (const { line, raw, cells } of rows) {
    if (!raw.trim()) continue
    // 머리줄이 표 중간에 다시 나오거나 합계 줄이면 건너뜀
    const first = norm(cells.join(''))
    if (findColumns(cells, PLAYER_COLS).name >= 0 || /^(합계|계|총계)/.test(first)) continue

    const { name, school, number: parenNumber } = splitSchool(cells[cols.name] ?? '')
    if (!name || INT.test(name)) {
      res.errors.push({ line, text: raw, reason: '선수 이름 칸이 비어 있거나 숫자예요' })
      continue
    }
    if (school && schoolKey(school) !== schoolKey(ourSchool)) {
      res.skipped.push({ line, text: raw, reason: `${school} 선수라 뺐어요` })
      continue
    }
    const number = cols.number >= 0 ? num(cells, cols.number, null) : parenNumber
    const goals = num(cells, cols.goals)
    const assists = num(cells, cols.assists)
    const yellow = num(cells, cols.yellow)
    const red = num(cells, cols.red)
    const bad: string[] = []
    if (number !== null && (Number.isNaN(number) || number < 0 || number > 99)) bad.push('등번호')
    if (goals === null || Number.isNaN(goals) || goals < 0 || goals > 30) bad.push('득점')
    if (assists === null || Number.isNaN(assists) || assists < 0 || assists > 30) bad.push('도움')
    if (yellow === null || Number.isNaN(yellow) || yellow < 0 || yellow > 2) bad.push('경고')
    if (red === null || Number.isNaN(red) || red < 0 || red > 1) bad.push('퇴장')
    if (bad.length) {
      res.errors.push({ line, text: raw, reason: `${bad.join('·')} 칸을 숫자로 읽지 못했어요` })
      continue
    }
    res.rows.push({ line, number, name, goals: goals!, assists: assists!, yellow: yellow!, red: red! })
  }

  // 같은 선수가 두 번 나오면 표를 잘못 복사했을 가능성 → 둘째 줄을 오류로
  const seen = new Map<string, number>()
  res.rows = res.rows.filter((r) => {
    const key = `${r.number ?? ''}|${r.name}`
    if (seen.has(key)) {
      res.errors.push({ line: r.line, text: `${r.number ?? ''} ${r.name}`, reason: `${seen.get(key)}번째 줄과 같은 선수예요` })
      return false
    }
    seen.set(key, r.line)
    return true
  })
  res.errors.sort((a, b) => a.line - b.line)
  return res
}

// ---------------------------------------------------------------- 순위표

export interface StandingLine {
  line: number
  team: string
  rank: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  yellow: number
  red: number
}

export interface StandingParse {
  rows: StandingLine[]
  errors: LineError[]
  missingColumns: string[]
  headerFound: boolean
}

const STANDING_COLS = {
  rank: ['순위'],
  team: ['팀명', '팀', '학교', '학교명', '대학', '대학명'],
  played: ['경기', '경기수', '경기 수'],
  won: ['승'],
  drawn: ['무'],
  lost: ['패'],
  goalsFor: ['득점', '득'],
  goalsAgainst: ['실점', '실'],
  points: ['승점'],
  yellow: ['경고'],
  red: ['퇴장'],
}

export function parseStandings(text: string): StandingParse {
  const lines = text.split(/\r?\n/)
  const res: StandingParse = { rows: [], errors: [], missingColumns: [], headerFound: false }
  let cols: Record<keyof typeof STANDING_COLS, number> | null = null
  const required = ['team', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points'] as const

  lines.forEach((raw, idx) => {
    const line = idx + 1
    if (!raw.trim()) return
    const cells = splitRow(raw)
    if (!cols) {
      const c = findColumns(cells, STANDING_COLS)
      if (required.every((k) => c[k] >= 0)) {
        cols = c
        res.headerFound = true
        res.missingColumns = (['yellow', 'red'] as const).filter((k) => c[k] < 0).map((k) => (k === 'yellow' ? '경고' : '퇴장'))
      }
      return
    }
    if (findColumns(cells, STANDING_COLS).team >= 0) return
    const team = splitSchool(cells[cols.team] ?? '').name
    if (!team) {
      res.errors.push({ line, text: raw, reason: '학교 이름 칸이 비어 있어요' })
      return
    }
    const get = (k: keyof typeof STANDING_COLS) => num(cells, cols![k])
    const n = {
      rank: get('rank'),
      won: get('won'),
      drawn: get('drawn'),
      lost: get('lost'),
      goalsFor: get('goalsFor'),
      goalsAgainst: get('goalsAgainst'),
      points: get('points'),
      yellow: get('yellow'),
      red: get('red'),
    }
    const played = cols.played >= 0 ? num(cells, cols.played) : (n.won ?? 0) + (n.drawn ?? 0) + (n.lost ?? 0)
    const bad = Object.entries({ ...n, played })
      .filter(([k, v]) => v === null || Number.isNaN(v) || (k !== 'points' && (v as number) < 0))
      .map(([k]) => ({ rank: '순위', won: '승', drawn: '무', lost: '패', goalsFor: '득점', goalsAgainst: '실점', points: '승점', yellow: '경고', red: '퇴장', played: '경기' })[k])
    if (bad.length) {
      res.errors.push({ line, text: raw, reason: `${bad.join('·')} 칸을 숫자로 읽지 못했어요` })
      return
    }
    if (played !== n.won! + n.drawn! + n.lost!) {
      res.errors.push({ line, text: raw, reason: `경기 수(${played})가 승+무+패(${n.won! + n.drawn! + n.lost!})와 달라요` })
      return
    }
    res.rows.push({ line, team, played: played!, ...(n as Record<keyof typeof n, number>) })
  })
  // 순위 칸이 없거나 0이면 붙여 넣은 순서대로
  res.rows.forEach((r, i) => {
    if (cols && cols.rank < 0) r.rank = i + 1
  })
  return res
}
