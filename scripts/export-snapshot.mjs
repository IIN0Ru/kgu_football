/**
 * Supabase 공개 스냅샷 → 사이트 자료 파일. publish 워크플로가 실행 (손으로: npm run export:snapshot)
 * - 공개(publishable) 키로 public_snapshot() 한 번만 호출 → 같은 시점의 자료 (비밀 키 없음)
 * - 검사(형식·급감)에 걸리거나 응답이 이상하면 파일을 하나도 쓰지 않고 실패 → 기존 정상 파일·사이트 유지
 * - 바뀐 파일만 씀. public/content-revision.json 에 반영한 DB 버전을 남겨 관리자 화면이 '반영 완료'를 확인
 * - 정말 많이 지운 것이면 ALLOW_SHRINK=1 로 실행
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { snapshotToFiles, validateSnapshot } from './snapshot-to-files.mjs'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../src/config/supabase.mjs'

// 시험용: EXPORT_ROOT(다른 폴더에 쓰기), SUPABASE_REST·SUPABASE_KEY(로컬 REST 주소·키) 로 바꿔 실행할 수 있음
const root = process.env.EXPORT_ROOT ? new URL(`file://${process.env.EXPORT_ROOT.replace(/\/?$/, '/')}`) : new URL('../', import.meta.url)
const rest = process.env.SUPABASE_REST ?? `${SUPABASE_URL}/rest/v1`
const key = process.env.SUPABASE_KEY ?? SUPABASE_PUBLISHABLE_KEY
const path = (p) => new URL(p, root)
const readJson = (p) => JSON.parse(readFileSync(path(p), 'utf8'))

const res = await fetch(`${rest}/rpc/public_snapshot`, {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: '{}',
  signal: AbortSignal.timeout(20_000),
})
if (!res.ok) {
  console.error(`스냅샷 요청 실패: ${res.status} ${(await res.text()).slice(0, 300)}`)
  process.exit(1)
}
const snap = await res.json()

const before = {
  matches: readJson('src/data/matches.json').matches.length,
  posts: (({ blog, magazine }) => blog.length + magazine.length)(readJson('src/data/posts.json')),
  standings: readJson('src/data/records.json').standings.length,
}
const problems = validateSnapshot(snap, process.env.ALLOW_SHRINK === '1' ? null : before)
if (problems.length) {
  console.error('스냅샷 검사 실패 — 파일을 바꾸지 않음:\n- ' + problems.join('\n- '))
  process.exit(1)
}

const files = snapshotToFiles(snap)
let changed = 0
// 내용으로 비교 (줄바꿈·띄어쓰기 모양과 갱신일만 다른 건 바뀐 것으로 보지 않음 → 같은 내용이면 커밋·배포 안 함)
const canon = (v) =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v
const same = (a, b) => JSON.stringify(canon({ ...a, updatedAt: null })) === JSON.stringify(canon({ ...b, updatedAt: null }))
for (const f of ['matches.json', 'records.json', 'posts.json']) {
  if (!same(files[f], readJson(`src/data/${f}`))) {
    writeFileSync(path(`src/data/${f}`), JSON.stringify(files[f], null, 2) + '\n')
    changed++
    console.log(`바뀜: src/data/${f}`)
  }
}
writeFileSync(path('public/content-revision.json'), JSON.stringify({ revision: snap.revision, changedAt: snap.changed_at }) + '\n')
console.log(`스냅샷 버전 ${snap.revision}, 바뀐 자료 파일 ${changed}개`)
