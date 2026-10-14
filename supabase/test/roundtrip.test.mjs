/**
 * 왕복 시험: 지금 JSON → seed → DB → 공개 스냅샷 → JSON 이 지금 파일과 같은지 (갱신일 제외)
 * rls.test.mjs 가 10/9 경기 기록을 바꾸므로, 여기서는 seed 직후 상태를 따로 만들어 비교
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { snapshotToFiles, validateSnapshot } from '../../scripts/snapshot-to-files.mjs'

const sql = (q) => execSync(`${process.env.PSQL} -At -c ${JSON.stringify(q)}`, { encoding: 'utf8' }).trim()
const root = new URL('../../', import.meta.url)
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'))

// 새 DB 상태: 공개 표를 비우고 seed 다시
sql('truncate public.player_records, public.standings, public.posts, public.matches, public.players, public.teams restart identity cascade')
execSync(`${process.env.PSQL} -f ${new URL('supabase/seed.sql', root).pathname}`)

const res = await fetch(`${process.env.API}/rpc/public_snapshot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
const snap = await res.json()
assert.deepEqual(validateSnapshot(snap, { matches: 10, posts: 10, standings: 8 }), [])
const files = snapshotToFiles(snap)

for (const f of ['matches.json', 'records.json', 'posts.json']) {
  const now = read(`src/data/${f}`)
  const got = structuredClone(files[f])
  if (f === 'matches.json') got.updatedAt = now.updatedAt // 갱신일은 DB 에 넣은 날짜라 다름
  assert.deepEqual(got, now, `${f} 이 지금 파일과 다름`)
  console.log(`  ✓ 왕복: ${f} 동일`)
}

// 연기·기록 없음·승점 조정이 공개 자료까지 남는지 (2026-10-14 데이터 계약)
sql(`update public.matches set status = 'postponed' where match_date = '2026-10-30'`)
sql(`delete from public.player_records where match_id = (select id from public.matches where match_date = '2026-05-15')`)
sql(`update public.matches set records_status = 'unavailable', records_note = 'KUSF 기록 미제공' where match_date = '2026-05-15'`)
sql(`update public.standings set points = points - 3, points_adjustment = -3 where team_id = (select id from public.teams where short_name = '여주대')`)
{
  const r = await fetch(`${process.env.API}/rpc/public_snapshot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  const f = snapshotToFiles(await r.json())
  assert.equal(f['matches.json'].matches.find((m) => m.date === '2026-10-30').status, 'postponed')
  assert.deepEqual(f['records.json'].unavailable, [{ date: '2026-05-15', note: 'KUSF 기록 미제공' }])
  assert.ok(!f['records.json'].matches.some((m) => m.date === '2026-05-15'))
  assert.equal(f['records.json'].standings.find((s) => s.team === '여주대').pointsAdjustment, -3)
  assert.equal(f['records.json'].matches.find((m) => m.date === '2026-05-01').note, '상대 자책골로 보임')
  console.log('  ✓ 연기·기록 없음·승점 조정·자책골 사유가 공개 자료에 남음')
}
// 되돌림 (다음 시험이 지금 자료 기준이라)
sql('truncate public.player_records, public.standings, public.posts, public.matches, public.players, public.teams restart identity cascade')
execSync(`${process.env.PSQL} -f ${new URL('supabase/seed.sql', root).pathname}`)

// 빈 응답·일부 응답은 거부
assert.ok(validateSnapshot({ ...snap, matches: [] }, { matches: 10 }).length > 0)
assert.ok(validateSnapshot({ revision: 1 }, null).length > 0)
assert.ok(validateSnapshot(null, null).length > 0)
console.log('  ✓ 빈 응답·일부 응답·깨진 응답 거부')
console.log('왕복·스냅샷 검사 통과')
