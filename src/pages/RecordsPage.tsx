/**
 * 시즌 기록 페이지 (/records) — 2026-10-08 (사용자 승인)
 * - 요약 숫자(순위·승점·승무패·득실·경고) → 경기별 득실 흐름 | 홈·원정 → 4권역 순위표 | 팀 득점 순위 → 선수 기록 전체
 * - 자료: src/data/records.ts (KUSF 수동 입력). 색은 빨강(경기대 득점) 하나 + 회색(실점)
 */
import { useEffect, useState } from 'react'
import { DockNav } from '@/components/dock-nav'
import { Eyebrow } from '@/components/eyebrow'
import { Reveal } from '@/components/motion'
import { SiteBackground } from '@/components/site-background'
import { SiteFooter } from '@/components/site-footer'
import { TeamCrest } from '@/components/team-crest'
import { heroImage, heroLogo, ourTeam } from '@/data/home'
import { navItems, pageLinks } from '@/data/nav'
import {
  matchFlow,
  ourStanding,
  playerSeason,
  recordsCompetition,
  recordsSource,
  recordsUpdatedAt,
  sideRecords,
  standings,
  unattributedTotal,
  type MatchFlow,
} from '@/data/records'
import { dayParts } from '@/lib/match-time'

const card = 'rounded-2xl bg-surface surface-blur p-6 md:rounded-[2rem] md:p-10'
const shortDate = (d: string) => {
  const { month, day } = dayParts(d)
  return `${month}.${day}`
}

function CardHead({
  eyebrow,
  title,
  id,
  aside,
}: {
  eyebrow: string
  title: string
  id: string
  aside?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-3">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className="section-title text-3xl leading-[0.95] md:text-5xl">
          {title}
        </h2>
      </div>
      {aside}
    </div>
  )
}

/** 표의 숫자: 0은 흐린 '0' 대신 '–'로 (흐린 글자는 대비가 부족해서, UX 점검 2026-10-08). 화면 읽기는 '0' */
function Count({ n }: { n: number }) {
  if (n) return <>{n}</>
  return (
    <>
      <span aria-hidden="true" className="text-fg/60">
        –
      </span>
      <span className="sr-only">0</span>
    </>
  )
}

/** 요약 숫자 한 칸 */
function Stat({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <span className="text-sm text-fg/60">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="font-num text-4xl leading-none tabular-nums md:text-6xl">{value}</span>
        {unit && <span className="text-sm text-fg/60">{unit}</span>}
      </span>
    </div>
  )
}

/** 경기별 득실: 기준선 위 빨강 막대 = 득점, 아래 회색 막대 = 실점 */
function FlowChart({ data }: { data: MatchFlow[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const unit = 16 // 1골 높이(px)
  const up = Math.max(1, ...data.map((m) => m.goalsFor)) * unit
  const down = Math.max(1, ...data.map((m) => m.goalsAgainst)) * unit

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 text-xs text-fg/60" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
          득점
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-fg/30" />
          실점
        </span>
      </div>
      <ol
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
        }}
      >
        {data.map((m, i) => {
          const result = m.goalsFor > m.goalsAgainst ? '승' : m.goalsFor === m.goalsAgainst ? '무' : '패'
          const label = `${shortDate(m.date)} ${m.opponent}(${m.side}) ${m.goalsFor}:${m.goalsAgainst} ${result}`
          const dim = hover !== null && hover !== i
          return (
            <li
              key={m.date}
              tabIndex={0}
              aria-label={label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className={`relative flex flex-col items-center outline-none transition-opacity duration-200 ${dim ? 'opacity-40' : ''}`}
            >
              {/* 득점: 위로 */}
              <div className="flex w-full flex-col items-center justify-end" style={{ height: up + 22 }}>
                <span className="mb-1 font-num text-sm tabular-nums">{m.goalsFor}</span>
                <span className="w-[42%] max-w-7 rounded-t bg-accent" style={{ height: m.goalsFor * unit }} />
              </div>
              <span className="h-px w-full bg-fg/40" />
              {/* 실점: 아래로 */}
              <div className="flex w-full flex-col items-center justify-start" style={{ height: down + 22 }}>
                <span className="w-[42%] max-w-7 rounded-b bg-fg/30" style={{ height: m.goalsAgainst * unit }} />
                <span className="mt-1 font-num text-sm tabular-nums text-fg/60">{m.goalsAgainst}</span>
              </div>
              <span className="mt-1 truncate text-xs font-medium">{m.opponent}</span>
              <span className="text-xs tabular-nums text-fg/60">{shortDate(m.date)}</span>
              {hover === i && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-fg px-2.5 py-1.5 text-xs text-white"
                >
                  {m.side} · {m.goalsFor}:{m.goalsAgainst} {result}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function RecordsPage() {
  // 중괄호로 감싸 아무것도 돌려주지 않게: 최신 크롬(152~)은 scrollTo 가 Promise 를 돌려주는데,
  // 그대로 돌려주면 React 가 정리 함수로 알고 페이지를 떠날 때 호출하다 앱 전체가 멈춤 (2026-10-08 버그 #53)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])
  const s = ourStanding
  const maxGoals = Math.max(1, ...playerSeason.map((p) => p.goals))
  const scorers = playerSeason.filter((p) => p.goals > 0)
  const updated = `${Number(recordsUpdatedAt.slice(5, 7))}월 ${Number(recordsUpdatedAt.slice(8))}일`

  return (
    <>
      <SiteBackground away image={heroImage} />
      <DockNav
        items={navItems}
        staticLogo={{ src: heroLogo.darkSrc, alt: heroLogo.alt }}
        pageTitle="시즌 기록"
        pages={pageLinks}
      />

      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-2 p-2 pt-16 md:grid-cols-12 md:gap-3 md:p-3 md:pt-20">
        {/* 요약 */}
        <div className="md:col-span-12">
          <Reveal aria-labelledby="records-title" className={card}>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <Eyebrow>Season 2026</Eyebrow>
                <h1 id="records-title" className="section-title text-4xl leading-[0.95] md:text-6xl">
                  시즌 기록
                </h1>
                <p className="text-sm text-fg/60">
                  {recordsCompetition} · {matchFlow.length}경기 · {updated} 기준
                </p>
              </div>
              {s ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                  <Stat label="4권역 순위" value={s.rank} unit="위" />
                  <Stat label="승점" value={s.points} />
                  <Stat
                    label="승 · 무 · 패"
                    value={
                      <>
                        {s.won}
                        <span className="mx-1 text-fg/30">·</span>
                        {s.drawn}
                        <span className="mx-1 text-fg/30">·</span>
                        {s.lost}
                      </>
                    }
                  />
                  <Stat label="득점" value={s.goalsFor} unit={`경기당 ${(s.goalsFor / s.played).toFixed(1)}`} />
                  <Stat label="실점" value={s.goalsAgainst} unit={`경기당 ${(s.goalsAgainst / s.played).toFixed(1)}`} />
                  <Stat label="경고 · 퇴장" value={`${s.yellow} · ${s.red}`} />
                </div>
              ) : (
                <p className="border-t border-line pt-6 text-fg/60">순위 자료 확인 중이에요.</p>
              )}
            </div>
          </Reveal>
        </div>

        {/* 경기별 흐름 */}
        <div className="md:col-span-7">
          <Reveal aria-labelledby="flow-title" className={card}>
            <div className="flex flex-col gap-8">
              <CardHead eyebrow="Match by match" title="경기별 득실" id="flow-title" />
              <FlowChart data={matchFlow} />
            </div>
          </Reveal>
        </div>

        {/* 홈·원정 */}
        <div className="md:col-span-5">
          <Reveal aria-labelledby="side-title" className={card} delay={0.08}>
            <div className="flex h-full flex-col gap-8">
              <CardHead eyebrow="Home & Away" title="홈 · 원정" id="side-title" />
              <div className="grid grid-cols-2 gap-6">
                {sideRecords.map((r) => (
                  <div key={r.side} className="flex flex-col gap-4 border-t border-line pt-4">
                    <span className="flex items-baseline justify-between">
                      <span className="text-base font-medium">{r.side}</span>
                      <span className="text-sm text-fg/60">{r.played}경기</span>
                    </span>
                    <span className="font-num text-4xl leading-none tabular-nums md:text-5xl">
                      {r.won}
                      <span className="mx-1 text-fg/30">·</span>
                      {r.drawn}
                      <span className="mx-1 text-fg/30">·</span>
                      {r.lost}
                    </span>
                    <span className="text-xs text-fg/60">승 · 무 · 패</span>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-fg/60">득점</dt>
                        <dd className="font-num text-2xl tabular-nums">{r.goalsFor}</dd>
                      </div>
                      <div>
                        <dt className="text-fg/60">실점</dt>
                        <dd className="font-num text-2xl tabular-nums text-fg/60">{r.goalsAgainst}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* 순위표 */}
        <div className="md:col-span-7">
          <Reveal aria-labelledby="table-title" className={card}>
            <div className="flex flex-col gap-6">
              <CardHead eyebrow="League table" title="4권역 순위" id="table-title" />
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-xs text-fg/60">
                      <th className="px-1.5 py-2 sm:px-2 text-left font-normal">순위</th>
                      <th className="px-1.5 py-2 sm:px-2 text-left font-normal">학교</th>
                      <th className="hidden px-1.5 py-2 sm:px-2 font-normal sm:table-cell">경기</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">승</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">무</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">패</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">득실</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">승점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((t) => {
                      const ours = t.team === ourTeam
                      return (
                        <tr
                          key={t.team}
                          className={`border-t border-line text-center ${ours ? 'relative font-medium' : 'text-fg/80'}`}
                        >
                          <td className="relative px-1.5 py-2.5 sm:px-2 text-left font-num text-base">
                            {ours && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-accent" />}
                            <span className="pl-2">{t.rank}</span>
                          </td>
                          <td className="px-1.5 py-2.5 sm:px-2">
                            <span className="flex items-center gap-2 text-left">
                              <TeamCrest name={t.team} className="h-7 w-7 text-xs" />
                              {t.team}
                            </span>
                          </td>
                          <td className="hidden px-1.5 py-2.5 sm:px-2 sm:table-cell">{t.played}</td>
                          <td className="px-1.5 py-2.5 sm:px-2">{t.won}</td>
                          <td className="px-1.5 py-2.5 sm:px-2">{t.drawn}</td>
                          <td className="px-1.5 py-2.5 sm:px-2">{t.lost}</td>
                          <td className="px-1.5 py-2.5 sm:px-2">{t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}</td>
                          <td className="px-1.5 py-2.5 sm:px-2 font-num text-base">{t.points}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>

        {/* 득점 순위 */}
        <div className="md:col-span-5">
          <Reveal aria-labelledby="scorers-title" className={card} delay={0.08}>
            <div className="flex h-full flex-col gap-6">
              <CardHead eyebrow="Top scorers" title="팀 득점" id="scorers-title" />
              <ol className="flex flex-col">
                {scorers.map((p, i) => (
                  <li
                    key={p.name}
                    className="grid grid-cols-[1.5rem_minmax(0,7rem)_minmax(0,1fr)_2rem] items-center gap-3 border-t border-line py-2.5"
                  >
                    <span className="font-num text-sm text-fg/60">{i + 1}</span>
                    <span className="truncate text-sm">
                      <span className="mr-1.5 font-num text-fg/60">{p.number}</span>
                      {p.name}
                    </span>
                    <span className="h-2 rounded-full bg-line">
                      <span
                        className="block h-2 rounded-full bg-accent"
                        style={{ width: `${(p.goals / maxGoals) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-num text-xl tabular-nums">{p.goals}</span>
                  </li>
                ))}
              </ol>
              {unattributedTotal > 0 && (
                <p className="text-xs text-fg/60">
                  선수 기록에 없는 득점 {unattributedTotal}골 (5월 1일 중앙대전, 상대 자책골로 보임)
                </p>
              )}
            </div>
          </Reveal>
        </div>

        {/* 선수 기록 전체 */}
        <div className="md:col-span-12">
          <Reveal aria-labelledby="players-title" className={card}>
            <div className="flex flex-col gap-6">
              <CardHead
                eyebrow="Players"
                title="선수 기록"
                id="players-title"
                aside={
                  <p className="text-sm text-fg/60">{playerSeason.length}명 · 명단 포함 경기는 교체 명단까지 센 수</p>
                }
              />
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-xs text-fg/60">
                      <th className="px-1.5 py-2 sm:px-2 text-left font-normal">번호</th>
                      <th className="px-1.5 py-2 sm:px-2 text-left font-normal">이름</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">명단 포함</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">득점</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">도움</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">경고</th>
                      <th className="px-1.5 py-2 sm:px-2 font-normal">퇴장</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerSeason.map((p) => (
                      <tr key={p.name} className="border-t border-line text-center">
                        <td className="px-1.5 py-2 sm:px-2 text-left font-num text-base text-fg/60">{p.number}</td>
                        <td className="px-1.5 py-2 sm:px-2 text-left">{p.name}</td>
                        <td className="px-1.5 py-2 sm:px-2 text-fg/70">{p.listed}</td>
                        <td className="px-1.5 py-2 font-num text-base sm:px-2">
                          <Count n={p.goals} />
                        </td>
                        <td className="px-1.5 py-2 sm:px-2">
                          <Count n={p.assists} />
                        </td>
                        <td className="px-1.5 py-2 sm:px-2">
                          <Count n={p.yellow} />
                        </td>
                        <td className="px-1.5 py-2 sm:px-2">
                          <Count n={p.red} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-fg/60">
                <a
                  href={recordsSource.url}
                  target="_blank"
                  rel="noopener"
                  className="tap-area underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg"
                >
                  출처 {recordsSource.label}
                <span className="sr-only">(새 창)</span></a>
                {' · '}자료 갱신 {updated} · 도움은 KUSF 기록 그대로
              </p>
            </div>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
