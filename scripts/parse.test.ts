// 관리자 화면 붙여넣기 읽기 시험 (npm run test:parse)
import assert from 'node:assert/strict'
import { parsePlayers, parseStandings } from '../src/admin/parse.ts'

// 탭으로 나뉜 표 + 제목 줄 + 다른 학교 선수 + 잘못된 숫자 + 중복
const p = parsePlayers(
  ['경기대 선수기록', '등번호\t선수명\t포지션\t득점\t도움\t경고\t퇴장', '1\t민선재\tGK\t0\t0\t0\t0', '10\t갈정민(경기대)\tMF\t1\t\t0\t0',
   '7\t홍길동(홍익대)\tFW\t1\t0\t0\t0', '2O\t김기완\tMF\t0\t0\t0\t0', '14\t정하민\tFW\t1\t1\t1\t0', '14\t정하민\tFW\t1\t1\t1\t0', '합계\t\t\t2\t1\t1\t0'].join('\n'))
assert.equal(p.headerFound, true)
assert.deepEqual(p.rows.map((r) => [r.number, r.name, r.goals, r.assists, r.yellow]), [[1, '민선재', 0, 0, 0], [10, '갈정민', 1, 0, 0], [14, '정하민', 1, 1, 1]])
assert.deepEqual(p.errors.map((e) => e.line), [6, 8])
assert.equal(p.skipped.length, 1)

// 머리줄 없음 → 아무것도 읽지 않음
assert.equal(parsePlayers('1\t민선재\t0\t0').headerFound, false)
// 공백 두 칸으로 나뉜 표, 도움 칸 없음
const q = parsePlayers('번호  이름  득점  경고\n9  LI BINGKE  2  1')
assert.deepEqual(q.rows[0], { line: 2, number: 9, name: 'LI BINGKE', goals: 2, assists: 0, yellow: 1, red: 0 })
assert.deepEqual(q.missingColumns, ['도움', '퇴장'])

const s = parseStandings(['순위\t팀명\t경기\t승\t무\t패\t득점\t실점\t득실\t승점\t경고\t퇴장', '1위\t경기대학교\t9\t8\t1\t0\t30\t12\t18\t25\t20\t0', '2\t중앙대\t9\t5\t1\t2\t21\t10\t11\t16\t14\t0'].join('\n'))
assert.equal(s.rows.length, 1)
assert.equal(s.rows[0].rank, 1)
assert.equal(s.rows[0].team, '경기대학교')
assert.equal(s.errors[0].line, 3) // 9경기인데 5+1+2
// KUSF 실제 붙여넣기 (2026-10-14, 10/9 홍익대전): 이름(등번호) 세로 묶음 → 득점·도움·경고·퇴장 숫자 묶음
const names = ['박준원(3)', '황병석(4)', '황장연(5)', '조민석(7)', '최지호(8)', '유태호(9)', '갈정민(10)', '정하민(14)', '권기원(16)', '이남호(17)', '한경호(18)', '권오성(20)', '최진수(21)', '김기완(22)', '손석주(27)', '민선재(77)', '박성준(99)']
const stats = names.map((_, i) => (i === 7 ? '0\t0\t1\t0' : i === 13 || i === 15 ? '1\t0\t0\t0' : '0\t0\t0\t0'))
const k = parsePlayers(['경기대 선수기록', '선수명', ...names, '득점\t도움\t경고\t퇴장', ...stats].join('\n'))
assert.equal(k.headerFound, true)
assert.equal(k.errors.length, 0)
assert.equal(k.rows.length, 17)
assert.deepEqual(k.rows[0], { line: 21, number: 3, name: '박준원', goals: 0, assists: 0, yellow: 0, red: 0 })
assert.deepEqual([k.rows[7].name, k.rows[7].yellow], ['정하민', 1])
assert.deepEqual(k.rows.filter((r) => r.goals).map((r) => [r.number, r.name]), [[22, '김기완'], [77, '민선재']])
// 숫자 줄이 하나 모자라면 짝을 맞추지 않음
const short = parsePlayers(['선수명', ...names, '득점\t도움\t경고\t퇴장', ...stats.slice(1)].join('\n'))
assert.equal(short.rows.length, 0)
assert.match(short.errors[0].reason, /17명인데 숫자 줄은 16줄/)
// KUSF 순위표 실제 붙여넣기 (2026-10-14): 학교명 세로 묶음 → 순위·경기수·승점… 숫자 묶음
const schools = ['경기대', '중앙대', '칼빈대', '용인대', '홍익대', '동원대', '성균관대', '여주대']
const nums = ['1\t9\t25\t8\t1\t0\t30\t12\t18\t0\t20\t0', '2\t9\t19\t6\t1\t2\t27\t11\t16\t0\t17\t0', '3\t9\t16\t5\t1\t3\t19\t18\t1\t0\t11\t2', '4\t8\t13\t4\t1\t3\t13\t10\t3\t0\t9\t0',
  '5\t9\t13\t4\t1\t4\t16\t16\t0\t0\t11\t0', '6\t8\t5\t1\t2\t5\t13\t19\t-6\t0\t22\t0', '7\t8\t5\t1\t2\t5\t10\t20\t-10\t0\t14\t1', '8\t8\t1\t0\t1\t7\t2\t24\t-22\t0\t17\t2']
const t = parseStandings(['학교명', ...schools, '순위\t경기수\t승점\t승\t무\t패\t득점\t실점\t득실\t도움\t경고\t퇴장', ...nums].join('\n'))
assert.equal(t.errors.length, 0)
assert.equal(t.rows.length, 8)
assert.deepEqual(t.rows[0], { line: 11, team: '경기대', rank: 1, played: 9, won: 8, drawn: 1, lost: 0, goalsFor: 30, goalsAgainst: 12, points: 25, yellow: 20, red: 0 })
assert.deepEqual([t.rows[7].team, t.rows[7].points, t.rows[7].red], ['여주대', 1, 2])
assert.match(parseStandings(['학교명', ...schools, '순위\t경기수\t승점\t승\t무\t패\t득점\t실점', ...nums.slice(2)].join('\n')).errors[0].reason, /8개인데 숫자 줄은 6줄/)
console.log('붙여넣기 읽기 시험 통과')
