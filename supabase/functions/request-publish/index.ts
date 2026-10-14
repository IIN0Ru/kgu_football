/**
 * '사이트에 반영' 중계 함수 (Supabase Edge Function, 2026-10-14)
 * 관리자 화면 → 이 함수 → GitHub 'publish.yml' 워크플로 실행
 *
 * - GitHub 토큰은 이 함수의 비밀값(GITHUB_DISPATCH_TOKEN)으로만 보관. 브라우저·저장소에 두지 않음
 *   토큰 권한: IIN0Ru/kgu_football 저장소 하나, Actions: Read and write 만 (fine-grained token)
 * - 누가 불렀는지는 로그인 토큰으로 DB 함수 request_publish() 를 불러 확인 (운영진이 아니면 DB 가 거부)
 *   → 함수 자체의 로그인 검사(verify JWT)에 기대지 않고 코드에서 권한을 확인
 * - request_publish() 가 60초 안 중복 요청을 걸러 dispatch=false 를 주면 GitHub 를 부르지 않음
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
// 공개 키 (사이트·저장소에도 있는 값). 대시보드에서 비밀값 PUBLISHABLE_KEY 로 넣어도 됨
const PUBLISHABLE_KEY = Deno.env.get('PUBLISHABLE_KEY') ?? 'sb_publishable_d1qpUz2BAW0Ou34YznjuQg_QSC8qI1V'
const GITHUB_TOKEN = Deno.env.get('GITHUB_DISPATCH_TOKEN') ?? ''
const REPO = 'IIN0Ru/kgu_football'
const WORKFLOW = 'publish.yml'
// 관리자 화면이 열리는 주소만 허용 (개발용 주소는 따로)
const ALLOWED_ORIGINS = new Set(['https://iin0ru.github.io', 'http://localhost:5173', 'http://localhost:4173'])

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://iin0ru.github.io',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const headers = { ...cors(origin), 'Content-Type': 'application/json' }
  const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) })
  if (req.method !== 'POST') return reply(405, { error: 'POST 만 받아요' })
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(403, { error: '허용되지 않은 주소예요' })

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return reply(401, { error: '로그인이 필요해요' })
  if (!GITHUB_TOKEN) return reply(500, { error: '중계 함수에 GitHub 토큰이 설정되지 않았어요' })

  // 1) 운영진 확인 + 중복 요청 걸러내기 (DB 가 판단)
  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/request_publish`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(10_000),
  })
  if (!rpc.ok) {
    return reply(rpc.status === 401 || rpc.status === 403 ? 403 : 502, { error: '운영진만 반영을 요청할 수 있어요' })
  }
  const { dispatch, revision } = await rpc.json()
  if (!dispatch) return reply(200, { ok: true, dispatched: false, revision, message: '이미 반영 요청이 진행 중이에요' })

  // 2) GitHub 워크플로 실행
  const gh = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'kgu-football-publish',
    },
    body: JSON.stringify({ ref: 'main' }),
    signal: AbortSignal.timeout(10_000),
  })
  if (gh.status !== 204) {
    console.error('GitHub dispatch 실패', gh.status, (await gh.text()).slice(0, 300))
    return reply(502, { error: 'GitHub 에 반영을 요청하지 못했어요. 잠시 뒤 다시 눌러 주세요' })
  }
  return reply(200, { ok: true, dispatched: true, revision })
})
