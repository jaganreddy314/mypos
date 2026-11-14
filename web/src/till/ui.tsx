import type { ReactNode } from 'react'

export function Toast({ text }: { text: string }) {
  if (!text) return null
  return (
    <div role="status" className="pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade rounded-xl bg-ink px-5 py-3 text-[15px] font-medium text-page shadow-[var(--shadow-float)]">
      {text}
    </div>
  )
}

/** One row of a totals block: label on the left, amount on the right. */
export function Row({ label, value, className = '' }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  )
}

/** "Fish Lips Samford" → "FS": the business's tile, as in the store app's sidebar. */
const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '·'

export function BusinessTile({ name, size = 36 }: { name?: string; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-[10px] bg-accent text-[14px] font-semibold text-accent-ink">
      {initials(name)}
    </span>
  )
}

/** A full-screen message, for the moments the till can't take orders yet. */
export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid h-full place-items-center bg-page p-8">
      <div className="card w-full max-w-[440px] p-7">
        <div className="mb-5 flex items-center gap-2.5">
          <BusinessTile name="Fish Lips" />
          <div>
            <div className="text-lg font-bold leading-tight">Till</div>
            <div className="text-sm text-muted">Counter orders &amp; payments</div>
          </div>
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-ink-2">{children}</div>
      </div>
    </div>
  )
}

export type PillTone = 'success' | 'warn' | 'neutral' | 'info' | 'danger'
const PILL: Record<PillTone, { cls: string; dot: string }> = {
  success: { cls: 'bg-[#ECFDF3] text-[#067647] dark:bg-[#053321] dark:text-[#75E0A7]', dot: '#17B26A' },
  warn: { cls: 'bg-[#FFFAEB] text-[#B54708] dark:bg-[#4E1D09] dark:text-[#FEC84B]', dot: '#F79009' },
  neutral: { cls: 'bg-surface-2 text-ink-2', dot: '#98A2B3' },
  info: { cls: 'bg-[#EFF8FF] text-[#175CD3] dark:bg-[#102A56] dark:text-[#84CAFF]', dot: '#2E90FA' },
  danger: { cls: 'bg-[#FEF3F2] text-[#B42318] dark:bg-[#55160C] dark:text-[#FDA29B]', dot: '#D92D20' },
}

/** Rounded status label with a coloured dot, as in the store app. */
export function Pill({ tone, pulse, children }: { tone: PillTone; pulse?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-[7px] pr-[9px] text-xs font-medium ${PILL[tone].cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${pulse ? 'animate-pulse-dot' : ''}`} style={{ background: PILL[tone].dot }} />
      {children}
    </span>
  )
}

/** A panel over the till, closed by its backdrop. */
export function Dialog({ onClose, width = 440, children }: { onClose: () => void; width?: number; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 flex animate-fade items-start justify-center bg-[rgba(16,24,40,0.4)] py-12" onClick={onClose}>
      <div role="dialog" aria-modal="true" style={{ width }} onClick={(e) => e.stopPropagation()}
        className="scroll max-h-full animate-slide rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-float)]">
        {children}
      </div>
    </div>
  )
}
