#!/usr/bin/env bash
# publish 워크플로의 내보내기 시험 (test-db.sh 안에서 실행: PSQL, API 사용)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/src/data" "$T/public"
cp "$ROOT"/src/data/{matches,records,posts}.json "$T/src/data/"
run() { EXPORT_ROOT="$T" SUPABASE_REST="$API_REST" SUPABASE_KEY=local node "$ROOT/scripts/export-snapshot.mjs"; }

out="$(run)"; echo "$out" | sed "s/^/    /"; echo "$out" | grep -q "바뀐 자료 파일 0개" && echo "  ✓ 내보내기: DB 가 지금 자료와 같으면 바뀐 파일 0개"
test -f "$T/public/content-revision.json" && echo "  ✓ 내보내기: 반영 버전 파일 생성"

$PSQL -c "update public.posts set title = '바뀐 제목 시험' where id = 1"
out="$(run)"; echo "$out" | grep -q "바뀜: src/data/posts.json" && grep -q "바뀐 제목 시험" "$T/src/data/posts.json" && echo "  ✓ 내보내기: 글 제목을 고치면 posts.json 만 바뀜"
echo "$out" | grep -q "바뀐 자료 파일 1개"

cp "$T/src/data/posts.json" "$T/posts.before"
$PSQL -c "update public.posts set archived_at = now()"
if run >/dev/null 2>&1; then echo "  ✗ 글 전부 보관(급감)인데 통과함"; exit 1; fi
cmp -s "$T/posts.before" "$T/src/data/posts.json" && echo "  ✓ 내보내기: 글이 갑자기 다 사라지면 실패하고 파일은 그대로"
$PSQL -c "update public.posts set archived_at = null"

if EXPORT_ROOT="$T" SUPABASE_REST="http://127.0.0.1:1" SUPABASE_KEY=x node "$ROOT/scripts/export-snapshot.mjs" >/dev/null 2>&1; then echo "  ✗ 접속 실패인데 통과"; exit 1; fi
cmp -s "$T/posts.before" "$T/src/data/posts.json" && echo "  ✓ 내보내기: DB 접속 실패 시 실패하고 파일은 그대로"
echo "내보내기 시험 통과"
