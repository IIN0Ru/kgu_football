/**
 * 팀 표시 원
 * - 로고가 있는 학교: 크림색 원 안에 로고 (어두운 배경에서도 남색·검정 로고가 보이게)
 *   마우스를 올리거나(데스크톱) 눌러서 포커스하면(모바일·키보드) 바로 "출처 ○○대학교" 말풍선이 뜬다.
 *   브라우저 기본 title 말풍선은 1초 가까이 늦게 뜨고 모바일에선 안 떠서 직접 만든 것.
 * - 로고가 없는 팀: 이전처럼 이니셜 한 글자 (우리 팀은 크림 채움, 상대는 테두리만)
 */
import { cn } from '@/lib/utils'
import { ourTeam } from '@/data/home'
import { schoolByShort } from '@/data/teams'

export function TeamCrest({
  name,
  className,
  align = 'center',
}: {
  name: string
  className?: string
  /** 말풍선 정렬. 카드 오른쪽 끝에 있는 원은 'end'로 해서 카드 밖으로 안 나가게 */
  align?: 'start' | 'center' | 'end'
}) {
  const school = schoolByShort(name)
  const base = 'flex shrink-0 items-center justify-center rounded-full'

  if (school) {
    return (
      <span
        tabIndex={0}
        role="img"
        aria-label={`${school.name} 로고, 출처 ${school.name}`}
        className={cn(base, 'group relative bg-cream outline-none', className)}
      >
        <img src={school.logo} alt="" className="max-h-[62%] max-w-[62%] object-contain" loading="lazy" />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-normal text-cream',
            'translate-y-1 opacity-0 transition-[opacity,transform] duration-200 ease-[var(--ease-pull)]',
            'group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-focus:translate-y-0 group-focus:opacity-100',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            align === 'start' && 'left-0',
            align === 'end' && 'right-0',
          )}
        >
          출처 {school.name}
        </span>
      </span>
    )
  }

  const ours = name === ourTeam
  return (
    <span
      aria-hidden="true"
      className={cn(base, 'font-medium', ours ? 'bg-cream text-black' : 'border border-line text-cream/50', className)}
    >
      {name.slice(0, 1)}
    </span>
  )
}
