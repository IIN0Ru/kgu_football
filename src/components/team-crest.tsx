/**
 * 팀 표시 원
 * - 로고가 있는 학교: 크림색 원 안에 로고 (어두운 배경에서도 남색·검정 로고가 보이게)
 *   원 자체가 그 학교 공식 홈페이지(로고 출처) 링크. 새 창으로 열림 (사용자 요청 2026-10-06)
 *   마우스를 올리면 원 둘레에 크림색 테두리가 생겨 누를 수 있다는 걸 알려줌
 * - 로고가 없는 팀: 이전처럼 이니셜 한 글자 (우리 팀은 크림 채움, 상대는 테두리만)
 */
import { cn } from '@/lib/utils'
import { ourTeam } from '@/data/home'
import { schoolByShort } from '@/data/teams'

export function TeamCrest({ name, className }: { name: string; className?: string }) {
  const school = schoolByShort(name)
  const base = 'flex shrink-0 items-center justify-center rounded-full'

  if (school) {
    return (
      <a
        href={school.url}
        target="_blank"
        rel="noopener"
        aria-label={`${school.name} 홈페이지 (로고 출처, 새 창)`}
        className={cn(
          base,
          'bg-cream ring-0 ring-cream/60 ring-offset-2 ring-offset-panel transition-[box-shadow,transform] duration-200 hover:scale-105 hover:ring-2 focus-visible:ring-2',
          className,
        )}
      >
        <img src={school.logo} alt="" className="max-h-[62%] max-w-[62%] object-contain" loading="lazy" />
      </a>
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
