/**
 * 관리자 입력 화면 (/admin) — 2026-10-14 (시안 사용자 승인 "좋아 진행하고")
 * - 운영진(개발자 + 축구부 운영진 2) 이메일·비밀번호 로그인. 가입 없음(계정은 개발자가 만듦)
 * - 경기 · 선수 기록 · 순위표 · 글 · 수정 기록 탭 → Supabase DB 에 저장 → '사이트에 반영'으로 GitHub 배포
 * - 이 페이지는 App.tsx 에서 따로 불러오므로(lazy) 공개 페이지 방문자는 supabase-js 를 받지 않음
 * - ☰ 페이지 목록에 넣지 않음. 검색에 나오지 않게 noindex
 */
import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { DockNav } from '@/components/dock-nav'
import { Eyebrow } from '@/components/eyebrow'
import { SiteBackground } from '@/components/site-background'
import { heroImage, heroLogo } from '@/data/home'
import { navItems, pageLinks } from '@/data/nav'
import { cn } from '@/lib/utils'
import { friendlyError, isLocalTest, supabase } from '@/admin/client'
import { loadAll, loadRevision, type AdminData } from '@/admin/data'
import { LogTab } from '@/admin/log-tab'
import { MatchesTab } from '@/admin/matches-tab'
import { PostsTab } from '@/admin/posts-tab'
import { PublishBar } from '@/admin/publish-bar'
import { RecordsTab } from '@/admin/records-tab'
import { StandingsTab } from '@/admin/standings-tab'
import { FeedbackLine, type Feedback } from '@/admin/ui'
import { btnLine, btnMain, input, label } from '@/admin/ui-tokens'

/** 지금 사이트에 반영된 DB 버전 (배포된 content-revision.json). 캐시를 피해 매번 새로 받음 */
async function fetchSiteRevision(): Promise<{ revision: number | null; changedAt: string | null }> {
  const res = await fetch(`${import.meta.env.BASE_URL}content-revision.json?t=${Date.now()}`, { cache: 'no-store' })
  const j = res.ok ? await res.json() : null
  return { revision: typeof j?.revision === 'number' ? j.revision : null, changedAt: j?.changedAt ?? null }
}

const card = 'rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10'

type Tab = 'matches' | 'records' | 'standings' | 'posts' | 'log'
const tabs: { id: Tab; label: string }[] = [
  { id: 'matches', label: '경기' },
  { id: 'records', label: '선수 기록' },
  { id: 'standings', label: '순위표' },
  { id: 'posts', label: '글' },
  { id: 'log', label: '수정 기록' },
]

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFeedback(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      const text = /invalid login credentials/i.test(error.message)
        ? '이메일 또는 비밀번호가 맞지 않아요'
        : /rate limit|too many/i.test(error.message)
          ? '여러 번 틀려서 잠시 막혔어요. 몇 분 뒤 다시 해 주세요'
          : /email not confirmed/i.test(error.message)
            ? '아직 확인되지 않은 계정이에요. 개발자에게 알려 주세요'
            : friendlyError(error)
      setFeedback({ tone: 'error', text })
    }
  }

  return (
    <form onSubmit={submit} className={cn(card, 'mx-auto flex w-full max-w-md flex-col gap-6')}>
      <div className="flex flex-col gap-3">
        <Eyebrow>Admin</Eyebrow>
        <h1 className="section-title text-3xl md:text-5xl">운영진 로그인</h1>
        <p className="text-sm text-fg/60">개발자가 만들어 준 계정으로만 들어올 수 있어요. 가입은 받지 않아요.</p>
      </div>
      <label className={label}>
        이메일
        <input className={input} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className={label}>
        비밀번호
        <input className={input} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <FeedbackLine value={feedback} />
      <button className={btnMain} disabled={busy}>
        {busy ? '확인 중…' : '로그인'}
      </button>
      <p className="text-xs text-fg/60">비밀번호를 잊었으면 개발자에게 다시 설정해 달라고 알려 주세요.</p>
    </form>
  )
}

function Workspace({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [data, setData] = useState<AdminData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [site, setSite] = useState<{ revision: number | null; changedAt: string | null }>({ revision: null, changedAt: null })
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(location.search).get('tab')
    return tabs.some((x) => x.id === t) ? (t as Tab) : 'matches'
  })
  const [recordsMatch, setRecordsMatch] = useState<number | null>(null)
  // 저장하지 않은 수정 (리뷰 2-3): 탭을 옮기거나 창을 닫을 때 확인
  const [dirty, setDirty] = useState(false)
  const [pendingTab, setPendingTab] = useState<Tab | null>(null)
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), [])
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const reload = useCallback(async () => {
    try {
      setData(await loadAll())
      setLoadError('')
    } catch (e) {
      setLoadError(friendlyError(e))
    }
  }, [])

  const refreshSite = useCallback(async () => {
    try {
      const s = await fetchSiteRevision()
      setSite(s)
      // 반영을 기다리는 동안 DB 버전도 새로 (다른 운영진이 저장했을 수 있음)
      const rev = await loadRevision().catch(() => null)
      if (rev !== null) setData((d) => (d && d.revision !== rev ? { ...d, revision: rev } : d))
      return s.revision
    } catch {
      return null
    }
  }, [])

  // 처음 열 때 한 번 불러옴. 응답이 오기 전에 화면을 떠나면 결과를 버림 (lint set-state-in-effect 정리, 2026-10-19)
  useEffect(() => {
    let alive = true
    loadAll().then(
      (d) => {
        if (!alive) return
        setData(d)
        setLoadError('')
      },
      (e) => alive && setLoadError(friendlyError(e)),
    )
    fetchSiteRevision().then(
      (s) => alive && setSite(s),
      () => {},
    )
    return () => {
      alive = false
    }
  }, [])

  function go(t: Tab, force = false) {
    if (dirty && t !== tab && !force) {
      setPendingTab(t)
      return
    }
    setPendingTab(null)
    setDirty(false)
    setTab(t)
    const u = new URL(location.href)
    u.searchParams.set('tab', t)
    history.replaceState(history.state, '', u)
  }

  return (
    <section className={cn(card, 'flex flex-col gap-6')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <Eyebrow>Admin</Eyebrow>
          <h1 className="section-title text-3xl leading-[0.95] md:text-5xl">관리자 입력</h1>
        </div>
        <span className="flex items-center gap-3 text-sm text-fg/60">
          {name} 로그인 중{isLocalTest ? ' (로컬 시험)' : ''}
          {!isLocalTest && (
            <button className="tap-area inline-flex items-center gap-1 text-fg underline underline-offset-4" onClick={onLogout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              로그아웃
            </button>
          )}
        </span>
      </div>

      {data && <PublishBar dbRevision={data.revision} siteRevision={site.revision} refreshSite={refreshSite} />}

      <nav className="flex flex-wrap gap-1 border-b border-line" aria-label="입력 종류">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={cn('-mb-px border-b-2 px-3 py-2.5 text-base', tab === t.id ? 'border-accent text-fg' : 'border-transparent text-fg/60 hover:text-fg')}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {pendingTab && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/50 bg-crest/60 p-3 text-sm">
          <span className="flex-1">저장하지 않은 수정이 있어요. 다른 탭으로 가면 입력한 내용이 사라져요 (붙여 넣은 표는 남아요).</span>
          <button className={btnLine} onClick={() => setPendingTab(null)}>
            계속 고치기
          </button>
          <button className={btnLine} onClick={() => go(pendingTab, true)}>
            버리고 이동
          </button>
        </div>
      )}

      {loadError && (
        <div className="flex flex-col items-start gap-3">
          <FeedbackLine value={{ tone: 'error', text: `자료를 불러오지 못했어요: ${loadError}` }} />
          <button className={btnLine} onClick={reload}>
            다시 불러오기
          </button>
        </div>
      )}
      {!data && !loadError && <p className="text-base text-fg/60">불러오는 중…</p>}
      {data && tab === 'matches' && (
        <MatchesTab
          data={data}
          reload={reload}
          onDirtyChange={onDirtyChange}
          onGoRecords={(id) => {
            setRecordsMatch(id)
            go('records')
          }}
        />
      )}
      {data && tab === 'records' && <RecordsTab key={recordsMatch ?? 'auto'} data={data} reload={reload} initialMatch={recordsMatch} onDirtyChange={onDirtyChange} />}
      {data && tab === 'standings' && <StandingsTab data={data} reload={reload} />}
      {data && tab === 'posts' && <PostsTab data={data} reload={reload} onDirtyChange={onDirtyChange} />}
      {data && tab === 'log' && <LogTab data={data} siteChangedAt={site.changedAt} />}
    </section>
  )
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(isLocalTest ? null : undefined)

  // 검색 엔진에 나오지 않게
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const title = document.title
    document.title = '관리자 · KGU FOOTBALL'
    return () => {
      meta.remove()
      document.title = title
    }
  }, [])

  useEffect(() => {
    if (isLocalTest) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // 운영진 확인 결과는 어느 계정의 것인지와 함께 보관 → 로그아웃·계정 전환 때 따로 지울 필요 없음
  const userId = session?.user.id ?? (isLocalTest ? 'local' : null)
  const [whoami, setWhoami] = useState<{ userId: string; value: { is_admin: boolean; display_name: string | null } } | null>(null)
  useEffect(() => {
    if (!userId) return
    let alive = true
    supabase.rpc('whoami').then(({ data, error }) => {
      if (alive) setWhoami({ userId, value: error ? { is_admin: false, display_name: null } : data })
    })
    return () => {
      alive = false
    }
  }, [userId])
  const me = whoami && whoami.userId === userId ? whoami.value : null

  const logout = () => supabase.auth.signOut()
  const checking = session === undefined || ((isLocalTest || session) && !me)

  return (
    <>
      <SiteBackground away image={heroImage} />
      <DockNav items={navItems} staticLogo={{ src: heroLogo.darkSrc, alt: heroLogo.alt }} pageTitle="관리자" pages={pageLinks} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-2 p-2 pt-16 md:gap-3 md:p-3 md:pt-20">
        {checking ? (
          <p className="py-20 text-center text-base text-fg/60">확인 중…</p>
        ) : !isLocalTest && !session ? (
          <div className="py-10">
            <Login />
          </div>
        ) : !me?.is_admin ? (
          <section className={cn(card, 'mx-auto flex w-full max-w-md flex-col gap-4')}>
            <h1 className="section-title text-3xl">운영진 계정이 아니에요</h1>
            <p className="text-base text-fg/60">로그인은 됐지만 운영진 명단에 없는 계정이에요. 개발자에게 등록을 부탁해 주세요.</p>
            <button className={btnLine} onClick={logout}>
              로그아웃
            </button>
          </section>
        ) : (
          <Workspace name={me.display_name ?? '운영진'} onLogout={logout} />
        )}
      </main>
    </>
  )
}
