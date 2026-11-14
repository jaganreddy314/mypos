import type { ReactNode } from 'react'


export function Toast({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="pointer-events-none absolute bottom-[26px] left-1/2 z-50 -translate-x-1/2 animate-fade rounded-md bg-neutral-900 px-[26px] py-[14px] font-heading text-base text-neutral-100 shadow-lg">
      {text}
    </div>
  )
}

/** One row of a totals block: label on the left, amount on the right. */
export function Row({ label, value, className = '' }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

/** A full-screen message, for the moments the till can't take orders yet. */
export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-[460px] rounded-md border border-divider bg-neutral-100 p-8 shadow-sm">
        <Brand />
        <h2 className="mt-6 text-[27px] font-medium">{title}</h2>
        <div className="mt-3 text-[14px] leading-relaxed text-neutral-700">{children}</div>
      </div>
    </div>
  )
}

export function Brand({ sub = 'Samford · Counter' }: { sub?: string }) {
  return (
    <div className="flex flex-col gap-px">
      <span className="font-heading text-[21px] uppercase leading-none tracking-[0.16em]">Fish Lips</span>
      <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-700">{sub}</span>
    </div>
  )
}
