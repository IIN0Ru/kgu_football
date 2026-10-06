/**
 * 팀 표시 원
 * - 로고가 있는 학교: 크림색 원 안에 로고 (어두운 배경에서도 남색·검정 로고가 보이게)
 *   마우스를 올리면 "출처 ○○대학교" 말풍선 (title)
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
      <span
        role="img"
        aria-label={`${school.name} 로고`}
        title={`출처 ${school.name}`}
        className={cn(base, 'bg-cream', className)}
      >
        <img src={school.logo} alt="" className="max-h-[62%] max-w-[62%] object-contain" loading="lazy" />
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
