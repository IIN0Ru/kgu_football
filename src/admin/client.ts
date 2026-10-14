/**
 * 관리자 화면 전용 Supabase 연결 (이 파일은 /admin 에서만 불러옴 → 공개 페이지에는 supabase-js 가 실리지 않음)
 * - 공개 키만 씀. 실제 권한은 DB 의 RLS·함수가 판단
 * - 개발용: `npm run dev:admin` (로컬 Postgres+PostgREST) 일 때만 로컬 주소와 시험용 토큰을 씀. 배포 빌드에는 들어가지 않음
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/config/supabase.mjs'

const localJwt = import.meta.env.DEV ? (import.meta.env.VITE_LOCAL_JWT as string | undefined) : undefined

/** 로컬 시험 중인지 (로그인 화면 대신 시험 운영진으로 바로 들어감) */
export const isLocalTest = Boolean(localJwt)

export const supabase: SupabaseClient = localJwt
  ? createClient(`${location.origin}/__local`, 'local', { accessToken: async () => localJwt })
  : createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kgu-admin-auth' },
    })

export const functionsUrl = `${SUPABASE_URL}/functions/v1`

/** DB 오류 → 운영진이 읽을 수 있는 문장 */
export function friendlyError(e: unknown): string {
  const err = e as { code?: string; message?: string; status?: number } | null
  const code = err?.code ?? ''
  const msg = err?.message ?? String(e)
  if (code === 'PT409') return '다른 사람이 먼저 고쳤어요. 새로 불러온 뒤 다시 저장해 주세요'
  if (code === '42501' || /permission denied|row-level security/i.test(msg)) return '운영진 권한이 없어요. 다시 로그인해 보세요'
  if (code === 'PGRST301' || /JWT expired/i.test(msg)) return '로그인이 만료됐어요. 다시 로그인해 주세요'
  if (code === '23505') return '이미 같은 항목이 있어요 (같은 날 같은 경기, 같은 주소의 글 등)'
  if (code === '23514') return /[가-힣]/.test(msg) ? msg : '입력값이 규칙에 맞지 않아요 (점수·시각·주소 형식을 확인해 주세요)'
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return '인터넷 연결을 확인해 주세요. 입력한 내용은 그대로 있어요'
  return /[가-힣]/.test(msg) ? msg : `저장하지 못했어요 (${code || msg})`
}
