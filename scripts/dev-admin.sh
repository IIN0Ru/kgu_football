#!/usr/bin/env bash
# 관리자 화면 로컬 시험: 임시 Postgres + PostgREST 에 지금 자료를 넣고, 시험 운영진으로 로그인된 개발 서버를 띄움
# 주소: http://localhost:5173/kgu_football/admin  (실제 Supabase 는 건드리지 않음, '사이트에 반영'은 동작하지 않음)
KEEP=1 exec bash "$(dirname "$0")/test-db.sh"
