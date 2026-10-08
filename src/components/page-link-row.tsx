/**
 * 카드 맨 아래 '다른 페이지로' 한 줄 (UX 점검 2026-10-08, 사용자 승인 2번 묶음 1번)
 * - 홈의 최근 결과 → 시즌 기록, 다음 경기 → 경기 일정. ☰ 버튼 말고도 페이지로 가는 길이 보이게
 * - 모양: 소식 목록 줄과 같은 '글자 + 화살표 원'(안쪽 이동이라 →). 마우스를 올리면 원이 빨강으로 채워짐
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PageLinkRow({ to, children, className = '' }: { to: string; children: string; className?: string }) {
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between gap-4 border-t border-line pt-4 text-sm font-medium transition-colors hover:text-fg ${className}`}
    >
      {children}
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line transition-colors duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent"
      >
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  )
}
