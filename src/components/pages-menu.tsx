/**
 * 메뉴 탭 옆 '페이지' 버튼 (2026-10-08 사용자 결정)
 * - 메뉴 탭은 홈 안 구역 이동·현재 위치 표시만 하고, 다른 페이지로 가는 입구는 이 버튼으로 분리
 * - 누르면 아래로 페이지 목록이 펼쳐짐. 지금 페이지는 빨간 점으로 표시
 * - 키보드: Esc 로 닫고 버튼으로 포커스 복귀, 바깥을 누르거나 다른 곳으로 포커스가 나가면 닫힘
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { LayoutGrid, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { PageLink } from '@/data/nav'

const EASE = [0.16, 1, 0.3, 1] as const

export function PagesMenu({ pages, onNavigate }: { pages: PageLink[]; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const id = useId()
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={wrap}
      className="relative"
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? '페이지 목록 닫기' : '페이지 목록 열기'}
        onClick={() => setOpen((v) => !v)}
        className={`surface-blur flex h-full items-center gap-2 rounded-b-2xl border border-t-0 border-line px-3 text-xs transition-colors md:rounded-b-3xl md:px-4 md:text-sm ${
          open ? 'bg-accent text-on-accent' : 'bg-bar text-fg/70 hover:text-fg'
        }`}
      >
        {open ? <X className="h-4 w-4" aria-hidden="true" /> : <LayoutGrid className="h-4 w-4" aria-hidden="true" />}
        <span className="hidden sm:inline">페이지</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0.15 : 0.3, ease: EASE }}
            className="surface-blur absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-bar p-1.5"
          >
            {pages.map((p) => {
              const here = p.href === pathname
              return (
                <li key={p.href}>
                  <Link
                    to={p.href}
                    aria-current={here ? 'page' : undefined}
                    onClick={() => {
                      onNavigate?.()
                      setOpen(false)
                    }}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-fg/[0.06]"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${here ? 'bg-accent' : 'border border-line'}`}
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{p.label}</span>
                      <span className="text-xs text-fg/60">{p.description}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
