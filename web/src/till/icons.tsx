import type { ReactNode } from 'react'

/** Lucide icons, drawn from their own paths as the store app does, so there's no icon library. */
export const Icon = ({ size = 18, stroke = 1.8, children }: { size?: number; stroke?: number; children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
    {children}
  </svg>
)
