/**
 * 관리자 입력 화면 (/admin) — 시안 (2026-10-14, 사용자 승인 전)
 * 지금은 화면 모양만: 예시 자료로 그리고 Supabase 에 연결하지 않음. 승인 뒤 실제 로그인·저장을 붙인다.
 * 주소 뒤 ?view=login|matches|paste|standings|posts|log 로 각 화면을 본다.
 */
import { useState } from 'react'
import { DockNav } from '@/components/dock-nav'
import { Eyebrow } from '@/components/eyebrow'
import { SiteBackground } from '@/components/site-background'
import { heroImage, heroLogo } from '@/data/home'
import { navItems, pageLinks } from '@/data/nav'
import { cn } from '@/lib/utils'
import { AlertTriangle, Check, CloudUpload, LogOut, Plus, RotateCcw, Archive, ArrowUp, ArrowDown } from 'lucide-react'

const card = 'rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10'
const input =
  'w-full rounded-xl border border-line bg-white/70 px-3 py-2.5 text-base text-fg outline-none focus:border-fg/60'
const label = 'flex flex-col gap-1.5 text-sm text-fg/60'
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium'
const btnMain = cn(btn, 'bg-accent text-on-accent')
const btnLine = cn(btn, 'border border-line bg-white/60 text-fg')

type Tab = 'matches' | 'paste' | 'standings' | 'posts' | 'log'
const tabs: { id: Tab; label: string }[] = [
  { id: 'matches', label: '경기' },
  { id: 'paste', label: '선수 기록' },
  { id: 'standings', label: '순위표' },
  { id: 'posts', label: '글' },
  { id: 'log', label: '수정 기록' },
]

function Login() {
  return (
    <section className={cn(card, 'mx-auto flex w-full max-w-md flex-col gap-6')}>
      <div className="flex flex-col gap-3">
        <Eyebrow>Admin</Eyebrow>
        <h1 className="section-title text-3xl md:text-5xl">운영진 로그인</h1>
        <p className="text-sm text-fg/60">개발자가 만들어 준 계정으로만 들어올 수 있어요. 가입은 받지 않아요.</p>
      </div>
      <label className={label}>
        이메일
        <input className={input} type="email" autoComplete="username" placeholder="name@example.com" />
      </label>
      <label className={label}>
        비밀번호
        <input className={input} type="password" autoComplete="current-password" />
      </label>
      <button className={btnMain}>로그인</button>
      <p className="text-xs text-fg/60">비밀번호를 잊었으면 개발자에게 다시 설정해 달라고 알려 주세요.</p>
    </section>
  )
}

/** 맨 위 상태 줄: 저장 ≠ 반영. DB 버전과 지금 사이트 버전을 나란히 보여 줌 */
function PublishBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-white/60 p-4">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-base font-medium">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          사이트에 아직 반영되지 않은 수정 2건
        </span>
        <span className="text-sm text-fg/60">DB 저장 버전 196 · 지금 사이트 194 — 저장만 해서는 사이트가 바뀌지 않아요</span>
      </div>
      <button className={btnMain}>
        <CloudUpload className="h-4 w-4" aria-hidden="true" />
        사이트에 반영
      </button>
    </div>
  )
}

const statusPill: Record<string, string> = {
  예정: 'border border-line text-fg/60',
  끝남: 'bg-fg text-white',
  '기록 대기': 'border border-accent text-accent',
}

function Matches() {
  const rows = [
    { d: '9.18 (금)', home: '경기대', away: '칼빈대', score: '3 : 2', st: '끝남' },
    { d: '10.9 (금)', home: '홍익대', away: '경기대', score: '0 : 2', st: '기록 대기' },
    { d: '10.30 (금)', home: '경기대', away: '중앙대', score: '15:00', st: '예정' },
  ]
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-2 lg:col-span-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-fg/60">2026 U리그 4권역 · 10경기</span>
          <button className={btnLine}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            경기 추가
          </button>
        </div>
        <ul className="flex flex-col">
          {rows.map((r, i) => (
            <li
              key={r.d}
              className={cn(
                'flex items-center gap-3 border-t border-line px-2 py-3',
                i === 1 && 'rounded-xl border-transparent bg-white/70',
              )}
            >
              <span className="w-20 text-sm text-fg/60">{r.d}</span>
              <span className="flex-1 text-base">
                {r.home} <span className="font-num text-fg/60">{r.score}</span> {r.away}
              </span>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs', statusPill[r.st])}>{r.st}</span>
            </li>
          ))}
        </ul>
      </div>

      <form className="flex flex-col gap-5 rounded-2xl bg-white/50 p-5 lg:col-span-7">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-fg/60">10월 9일 (금) 11:00 · 화성비봉습지공원축구장</span>
          <span className="text-xl font-medium">홍익대 vs 경기대</span>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-fg/60">상태</legend>
          <div className="flex flex-wrap gap-2">
            {['예정', '끝남', '연기', '취소'].map((s) => (
              <span key={s} className={cn(btn, s === '끝남' ? 'bg-fg text-white' : 'border border-line bg-white/60')}>
                {s}
              </span>
            ))}
          </div>
        </fieldset>
        <div className="flex items-end gap-3">
          <label className={cn(label, 'flex-1')}>
            홍익대 (홈)
            <input className={cn(input, 'text-center font-num text-3xl')} defaultValue="0" inputMode="numeric" />
          </label>
          <span className="pb-3 font-num text-3xl text-fg/30">:</span>
          <label className={cn(label, 'flex-1')}>
            경기대 (원정)
            <input className={cn(input, 'text-center font-num text-3xl')} defaultValue="2" inputMode="numeric" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            날짜
            <input className={input} defaultValue="2026-10-09" />
          </label>
          <label className={label}>
            시각 (모르면 비워 두기 → '시간 확인 중')
            <input className={input} defaultValue="11:00" />
          </label>
          <label className={cn(label, 'sm:col-span-2')}>
            장소
            <input className={input} defaultValue="화성비봉습지공원축구장" />
          </label>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-fg/60">
          <AlertTriangle className="h-4 w-4 text-accent" aria-hidden="true" />
          선수 기록이 아직 없어요 — KUSF 기록이 올라오면 ‘선수 기록’ 탭에서 붙여 넣으세요
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={btnLine}>
            <Archive className="h-4 w-4" aria-hidden="true" />
            보관 (숨기기)
          </button>
          <button type="button" className={btnMain}>
            <Check className="h-4 w-4" aria-hidden="true" />
            저장
          </button>
        </div>
      </form>
    </div>
  )
}

const pasted = `등번호\t선수명\t포지션\t출전\t득점\t도움\t경고\t퇴장
1\t민선재\tGK\t선발\t0\t0\t0\t0
4\t황병석\tDF\t선발\t0\t0\t1\t0
10\t갈정민\tMF\t선발\t1\t0\t0\t0
14\t정하민\tFW\t선발\t1\t1\t0\t0
18\t한경호\tFW\t교체\t0\t1\t0\t0
2O\t김기완\tMF\t교체\t0\t0\t0\t0`

function Paste() {
  const preview = [
    { n: 1, name: '민선재', g: 0, a: 0, y: 0, r: 0 },
    { n: 4, name: '황병석', g: 0, a: 0, y: 1, r: 0 },
    { n: 10, name: '갈정민', g: 1, a: 0, y: 0, r: 0 },
    { n: 14, name: '정하민', g: 1, a: 1, y: 0, r: 0 },
    { n: 18, name: '한경호', g: 0, a: 1, y: 0, r: 0 },
  ]
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className={label}>
          어느 경기의 기록인가요
          <select className={input} defaultValue="1009">
            <option value="1009">10월 9일 홍익대 0 : 2 경기대 (기록 대기)</option>
          </select>
        </label>
        <label className={label}>
          KUSF ‘경기대 선수기록’ 표를 통째로 복사해 붙여 넣기
          <textarea className={cn(input, 'h-64 font-mono text-sm')} defaultValue={pasted} />
        </label>
        <p className="text-xs text-fg/60">붙여 넣은 글은 저장에 실패해도 이 칸에 그대로 남아요.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-fg/60">미리보기 — 저장 전 확인</span>
          <span className="text-base">
            선수 5명 · 득점 합 <b className="font-medium">2</b> = 경기대 점수 <b className="font-medium">2</b>
            <Check className="ml-1 inline h-4 w-4" aria-label="맞음" />
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-fg/60">
            <tr>
              {['번호', '이름', '득점', '도움', '경고', '퇴장'].map((h) => (
                <th key={h} className="border-b border-line py-2 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((p) => (
              <tr key={p.n} className="border-b border-line">
                <td className="py-2 font-num">{p.n}</td>
                <td>{p.name}</td>
                <td>{p.g || '–'}</td>
                <td>{p.a || '–'}</td>
                <td>{p.y || '–'}</td>
                <td>{p.r || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-start gap-2 rounded-xl border border-accent/50 bg-white/60 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>
            6번째 줄을 읽지 못했어요: <code className="font-mono">2O 김기완 …</code> — 등번호에 숫자가 아닌 글자가 있어요.
            고치거나 이 줄을 빼고 저장할 수 있어요.
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
          상대 자책골 등 선수에게 안 들어간 골이 있어요
        </label>
        <div className="flex justify-end gap-2">
          <button className={btnLine}>읽지 못한 줄 빼고 저장</button>
          <button className={cn(btnMain, 'opacity-40')} disabled>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

function Standings() {
  const rows = [
    ['1', '중앙대', '9', '7', '1', '1', '+15', '22'],
    ['2', '경기대', '9', '6', '1', '2', '+9', '19'],
    ['3', '성균관대', '9', '5', '2', '2', '+6', '17'],
  ]
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <label className={label}>
        KUSF 4권역 순위표를 통째로 복사해 붙여 넣기 (전체 교체)
        <textarea className={cn(input, 'h-56 font-mono text-sm')} placeholder="순위  팀명  경기  승  무  패 …" />
      </label>
      <div className="flex flex-col gap-3">
        <span className="text-sm text-fg/60">미리보기 · 8팀 · 지금 표와 바뀐 곳은 빨간 글자</span>
        <table className="w-full text-left text-sm">
          <thead className="text-fg/60">
            <tr>
              {['순위', '학교', '경기', '승', '무', '패', '득실', '승점'].map((h) => (
                <th key={h} className="border-b border-line py-2 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[1]} className="border-b border-line">
                {r.map((c, i) => (
                  <td key={i} className={cn('py-2', r[1] === '경기대' && i >= 2 && 'text-accent')}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-fg/60">경기 수 = 승+무+패, 승점이 맞지 않는 줄이 있으면 저장하지 않아요.</p>
        <div className="flex justify-end">
          <button className={btnMain}>순위표 저장</button>
        </div>
      </div>
    </div>
  )
}

function Posts() {
  const rows = [
    { t: '[KGU series 12] 가야대전 멀티골의 주인공! …', k: '블로그 · 인터뷰', d: '10.6' },
    { t: '[KGU series 11] U리그 4권역 최다 득점팀, 캡틴 …', k: '블로그 · 인터뷰', d: '6.9' },
    { t: '[KGU series 10] 득점왕의 탄생, 경기대의 새로운 …', k: '블로그 · 인터뷰', d: '5.21' },
  ]
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-2 lg:col-span-7">
        <div className="flex flex-wrap items-center gap-2">
          {['블로그', '매거진', '보관함'].map((s, i) => (
            <span key={s} className={cn(btn, i === 0 ? 'bg-fg text-white' : 'border border-line bg-white/60')}>
              {s}
            </span>
          ))}
          <span className="ml-auto text-sm text-fg/60">위에 있을수록 먼저 보여요</span>
        </div>
        <ul>
          {rows.map((r) => (
            <li key={r.t} className="flex items-center gap-3 border-t border-line py-3">
              <span className="flex flex-col">
                <button aria-label="위로" className="tap-area text-fg/60">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button aria-label="아래로" className="tap-area text-fg/60">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base">{r.t}</span>
                <span className="text-xs text-fg/60">
                  {r.k} · {r.d}
                </span>
              </span>
              <button className={btnLine}>
                <Archive className="h-4 w-4" aria-hidden="true" />
                보관
              </button>
            </li>
          ))}
        </ul>
      </div>
      <form className="flex flex-col gap-4 rounded-2xl bg-white/50 p-5 lg:col-span-5">
        <span className="text-base font-medium">새 글 추가</span>
        <label className={label}>
          원문 주소 (https 로 시작)
          <input className={input} placeholder="https://blog.naver.com/orangeturtles/…" />
        </label>
        <label className={label}>
          제목
          <input className={input} />
        </label>
        <label className={label}>
          소개 한 문장 (없어도 됨)
          <textarea className={cn(input, 'h-20')} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            분류
            <input className={input} placeholder="인터뷰" />
          </label>
          <label className={label}>
            날짜
            <input className={input} placeholder="2026-10-14" />
          </label>
        </div>
        <p className="text-xs text-fg/60">사진은 넣지 않아요. 제목·소개·원문 링크만.</p>
        <button type="button" className={btnMain}>
          글 추가
        </button>
      </form>
    </div>
  )
}

function Log() {
  const rows = [
    ['10.14 21:05', '운영진 A', '경기', '10.9 홍익대전 — 상태 예정 → 끝남, 점수 0 : 2', '반영 전'],
    ['10.14 21:03', '운영진 A', '글', '블로그 글 추가 — [KGU series 13] …', '반영 전'],
    ['10.9 18:20', '개발자', '경기', '10.30 중앙대전 — 시각 확인 중 → 15:00', '반영됨'],
  ]
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-fg/60">최근 50건 · 잘못 고친 건 해당 탭에서 다시 고치면 돼요 (보관한 것은 보관함에서 되살리기)</span>
      <ul>
        {rows.map((r) => (
          <li key={r[0] + r[3]} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 border-t border-line py-3 md:grid-cols-[7rem_6rem_4rem_1fr_auto]">
            <span className="text-sm text-fg/60">{r[0]}</span>
            <span className="hidden text-sm md:block">{r[1]}</span>
            <span className="hidden text-sm text-fg/60 md:block">{r[2]}</span>
            <span className="text-base">{r[3]}</span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs',
                r[4] === '반영됨' ? 'border border-line text-fg/60' : 'border border-accent text-accent',
              )}
            >
              {r[4]}
            </span>
          </li>
        ))}
      </ul>
      <button className={cn(btnLine, 'self-start')}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />더 보기
      </button>
    </div>
  )
}

export function AdminPage() {
  const view = new URLSearchParams(location.search).get('view') ?? 'matches'
  const [tab, setTab] = useState<Tab>((tabs.find((t) => t.id === view)?.id ?? 'matches') as Tab)
  const loggedIn = view !== 'login'

  return (
    <>
      <SiteBackground away image={heroImage} />
      <DockNav items={navItems} staticLogo={{ src: heroLogo.darkSrc, alt: heroLogo.alt }} pageTitle="관리자" pages={pageLinks} />
      <main className="mx-auto flex max-w-[1440px] flex-col gap-2 p-2 pt-16 md:gap-3 md:p-3 md:pt-20">
        {!loggedIn ? (
          <div className="py-10">
            <Login />
          </div>
        ) : (
          <section className={cn(card, 'flex flex-col gap-6')}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-3">
                <Eyebrow>Admin</Eyebrow>
                <h1 className="section-title text-3xl leading-[0.95] md:text-5xl">관리자 입력</h1>
              </div>
              <span className="flex items-center gap-3 text-sm text-fg/60">
                운영진 A 로그인 중
                <button className="tap-area inline-flex items-center gap-1 text-fg underline underline-offset-4">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  로그아웃
                </button>
              </span>
            </div>
            <PublishBar />
            <nav className="flex flex-wrap gap-1 border-b border-line" aria-label="입력 종류">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={cn(
                    '-mb-px border-b-2 px-3 py-2.5 text-base',
                    tab === t.id ? 'border-accent text-fg' : 'border-transparent text-fg/60',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            {tab === 'matches' && <Matches />}
            {tab === 'paste' && <Paste />}
            {tab === 'standings' && <Standings />}
            {tab === 'posts' && <Posts />}
            {tab === 'log' && <Log />}
          </section>
        )}
      </main>
    </>
  )
}
