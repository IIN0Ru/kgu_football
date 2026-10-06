/**
 * 구역 제목 위 작은 머리말: 빨간 육각형(거북 등껍질 한 칸) + 영문 대문자 (시안 C, 2026-10-07)
 */
export function Eyebrow({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-1.5 font-num text-[0.95rem] uppercase leading-none tracking-[0.12em] text-accent">
      <span
        aria-hidden="true"
        className="h-[13px] w-3 shrink-0 bg-accent [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]"
      />
      {children}
    </p>
  )
}
