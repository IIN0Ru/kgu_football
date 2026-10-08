/**
 * 선수단
 * - 포지션별 4묶음(GK·DF·MF·FW), 각 줄은 번호 · 이름 · 학년
 * - 공개 항목은 이름·번호·포지션·학년뿐 (사진·생년월·키·몸무게·출신교는 쓰지 않음, 사용자 결정)
 * - 출처와 마지막 갱신일을 함께 표시 (KUFC, 주 1회 자동 갱신)
 */
import { Eyebrow } from '@/components/eyebrow'
import type { Player, Position } from '@/data/home'

const GROUPS: { key: Position; label: string }[] = [
  { key: 'GK', label: '골키퍼' },
  { key: 'DF', label: '수비수' },
  { key: 'MF', label: '미드필더' },
  { key: 'FW', label: '공격수' },
]

function formatDate(d: string) {
  const [, m, day] = d.split('-').map(Number)
  return `${m}월 ${day}일`
}

export function RosterSection({
  players,
  source,
  updatedAt,
  titleId,
}: {
  players: Player[]
  source: { label: string; url: string }
  updatedAt: string
  titleId: string
}) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Eyebrow>Squad 2026</Eyebrow>
          <h2
            id={titleId}
            className="section-title text-4xl leading-[0.95] md:text-6xl"
          >
            선수단
          </h2>
          <p className="text-sm text-fg/60">2026 시즌 등록 선수 {players.length}명</p>
        </div>
        <p className="text-sm text-fg/60">
          <a
            href={source.url}
            target="_blank"
            rel="noopener"
            className="tap-area underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
          >
            출처 {source.label}
          <span className="sr-only">(새 창)</span></a>
          {' · '}
          {formatDate(updatedAt)} 기준
        </p>
      </div>

      <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map(({ key, label }) => {
          const group = players.filter((p) => p.position === key)
          return (
            <section key={key} aria-label={label} className="flex flex-col">
              <h3 className="mb-3 flex items-baseline justify-between text-sm text-fg/60">
                <span>
                  {label} <span className="text-fg/60">{key}</span>
                </span>
                <span>{group.length}</span>
              </h3>
              {group.length === 0 ? (
                <p className="border-t border-line py-3 text-fg/60">확인 중</p>
              ) : (
                <ul className="border-b border-line">
                  {group.map((p) => (
                    <li
                      key={`${p.number}-${p.name}`}
                      className="flex items-baseline gap-4 border-t border-line py-3"
                    >
                      <span className="w-7 shrink-0 text-right font-num text-base tabular-nums text-fg/60">
                        {p.number ?? '–'}
                      </span>
                      <span className="flex-1 text-lg font-medium">{p.name}</span>
                      {p.grade && <span className="text-sm text-fg/60">{p.grade}학년</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
