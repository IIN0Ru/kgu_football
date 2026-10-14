#!/usr/bin/env bash
# DB 권한·저장 함수 시험 (개발용). 실행: npm run test:db
# 임시 Postgres + PostgREST(Supabase 가 쓰는 REST 서버)를 띄우고, Supabase 역할을 흉내 낸 뒤
# 마이그레이션 → 자료 옮기기 → REST 로 방문자/일반 로그인/운영진 시험 → 정리
# 필요: Postgres 16 바이너리(PGBIN), PostgREST 바이너리(PGRST). 실제 Supabase 에는 아무것도 하지 않음
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGRST="${PGRST:-/tmp/kgu-pgrst/postgrest}"
PORT="${PGPORT_TEST:-54329}"
API_PORT="${API_PORT_TEST:-3999}"
WORK="$(mktemp -d /tmp/kgu-dbtest.XXXXXX)"
export JWT_SECRET="local-test-secret-$(date +%s)-0123456789abcdef"

as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
cleanup() {
  [ -n "${API_PID:-}" ] && kill "$API_PID" 2>/dev/null || true
  as_pg "$PGBIN/pg_ctl -D $WORK/data stop -m fast" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

[ "$(id -u)" = 0 ] && chown postgres "$WORK"
as_pg "$PGBIN/initdb -D $WORK/data -A trust -E UTF8 -U postgres" >/dev/null
as_pg "$PGBIN/pg_ctl -D $WORK/data -o '-p $PORT -k $WORK -c listen_addresses=127.0.0.1' -l $WORK/log start" >/dev/null
sleep 1
export PGOPTIONS="-c client_min_messages=warning"
export PSQL="psql -h $WORK -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"

$PSQL -f "$ROOT/supabase/test/local_stub.sql"
$PSQL -f "$ROOT/supabase/migrations/0001_admin_schema.sql"
$PSQL -f "$ROOT/supabase/migrations/0001_admin_schema.sql"   # 두 번 돌려도 되는지
node "$ROOT/scripts/make-seed.mjs" >/dev/null
$PSQL -f "$ROOT/supabase/seed.sql"
$PSQL -f "$ROOT/supabase/seed.sql"                           # 두 번 돌려도 되는지

cat > "$WORK/pgrst.conf" <<EOF
db-uri = "postgres://authenticator:local-only@127.0.0.1:$PORT/postgres"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-port = $API_PORT
server-host = "127.0.0.1"
EOF
"$PGRST" "$WORK/pgrst.conf" >"$WORK/pgrst.log" 2>&1 &
API_PID=$!
for _ in $(seq 1 40); do curl -s "http://127.0.0.1:$API_PORT/" >/dev/null 2>&1 && break; sleep 0.25; done

export API="http://127.0.0.1:$API_PORT"

# 관리자 화면 로컬 시험 (npm run dev:admin): 시험 운영진을 만들고 개발 서버를 이 DB 에 붙여 띄움. Ctrl+C 로 끝내면 DB 도 지움
if [ -n "${KEEP:-}" ]; then
  ADMIN_ID="$(node -e "console.log(crypto.randomUUID())")"
  $PSQL -c "insert into auth.users (id, email) values ('$ADMIN_ID', 'local-admin@test'); insert into private.admins (user_id, display_name) values ('$ADMIN_ID', '로컬 시험 운영진')"
  JWT="$(node -e "
    const c=require('node:crypto');const b=(o)=>Buffer.from(JSON.stringify(o)).toString('base64url');
    const h=b({alg:'HS256',typ:'JWT'}),p=b({role:'authenticated',sub:'$ADMIN_ID',exp:Math.floor(Date.now()/1000)+8*3600});
    console.log(h+'.'+p+'.'+c.createHmac('sha256',process.env.JWT_SECRET).update(h+'.'+p).digest('base64url'))")"
  echo "로컬 DB: $API · psql: $PSQL"
  echo "$PSQL" > "${KEEP_PSQL_FILE:-/dev/null}"
  cd "$ROOT" && LOCAL_API="$API" VITE_LOCAL_JWT="$JWT" npx vite --port "${DEV_PORT:-5173}" --strictPort
  exit 0
fi

node "$ROOT/supabase/test/rls.test.mjs"
node "$ROOT/supabase/test/roundtrip.test.mjs"
export API_REST="$API" ; bash "$ROOT/supabase/test/export.test.sh"
