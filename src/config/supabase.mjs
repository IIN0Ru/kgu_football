/**
 * Supabase 공개 설정 (2026-10-14). 둘 다 공개돼도 되는 값 — 실제 보호는 DB 의 행 단위 보안(RLS)이 맡음
 * 비밀 키(sb_secret_… / service_role)는 여기·저장소 어디에도 넣지 않는다
 * 공개 사이트 화면은 이 DB 를 읽지 않음 (publish 워크플로·관리자 화면만 사용)
 */
export const SUPABASE_URL = 'https://bkqvxavxkrbiooezgqss.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_d1qpUz2BAW0Ou34YznjuQg_QSC8qI1V'
