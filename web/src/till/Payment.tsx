// Taking payment. Card is paid on the Tyro terminal: the amount is keyed in there, and the
// till is told it went through. (Sending the amount to the terminal directly comes with Tyro's
// integration.) Cash works out the change, to the nearest 5 cents.
import { useState } from 'react'
import { money } from '../lib/money'
import { cashDue, lineDetail, lineTotal, orderContext, paidOf, surchargeOf, totals, type Line, type OrderType, type Payment as Paid } from '../lib/order'
import { peekOrderNumber } from '../lib/settings'
import { GLYPH } from './glyphs'
import { Icon } from './icons'
import { Row } from './ui'

export function Payment({ number, type, reference, lines, payments, surchargePct, onBack, onPaid }: {
  number?: number
  type: OrderType
  reference: string
  lines: Line[]
  payments: Paid[]
  surchargePct: number
  onBack: () => void
  onPaid: (p: Omit<Paid, 'takenAt'>) => void
}) {
  const [method, setMethod] = useState<'card' | 'cash'>('card')
  const [tendered, setTendered] = useState(0)
  const t = totals(lines)
  const owing = Math.max(0, t.subtotal - paidOf({ payments }))
  const surcharge = method === 'card' ? surchargeOf(owing, surchargePct) : 0
  const due = method === 'card' ? owing + surcharge : cashDue(owing)

  const pay = (tendered: number | null) => onPaid({ id: crypto.randomUUID(), method, amount: owing, surcharge, tendered })

  return (
    <div className="absolute inset-0 z-40 flex animate-fade bg-page">
      <div className="flex w-[440px] flex-none flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-6 pb-4 pt-5">
          <div className="text-xs font-medium uppercase tracking-[0.04em] text-faint">Taking payment</div>
          <h1 className="mt-1 text-2xl font-semibold">Order <span className="num">#{number ?? peekOrderNumber()}</span></h1>
          <p className="mt-1 text-sm text-muted">{orderContext(type, reference)} · {t.count} items</p>
        </div>
        <div className="scroll min-h-0 flex-1 px-6 py-1">
          {lines.map((l) => (
            <div key={l.key} className="border-b border-line-2 py-3">
              <div className="flex justify-between gap-2.5">
                <span className="font-semibold">{l.qty} × {l.name}</span>
                <span className="num font-semibold">{money(lineTotal(l))}</span>
              </div>
              {lineDetail(l) && <div className="mt-0.5 text-xs text-muted">{lineDetail(l)}</div>}
            </div>
          ))}
        </div>
        <div className="border-t border-line px-6 pb-6 pt-4">
          <Row className="text-sm text-muted" label="Subtotal" value={money(t.subtotal)} />
          {owing !== t.subtotal && <Row className="mt-1 text-sm text-muted" label="Already paid" value={money(t.subtotal - owing)} />}
          {surcharge > 0
            ? <Row className="mt-1 text-sm text-muted" label={`Card surcharge ${surchargePct}%`} value={money(surcharge)} />
            : <Row className="mt-1 text-sm text-muted" label="Incl. GST" value={money(t.gst)} />}
          {method === 'cash' && due !== owing && <Row className="mt-1 text-sm text-muted" label="Rounded for cash" value={money(due - owing)} />}
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-base font-semibold">Amount due</span>
            <span className="num text-[36px] font-semibold tracking-[-0.02em] text-accent">{money(due)}</span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line bg-surface px-6 py-4">
          <div role="group" aria-label="Pay by" className="seg flex-1 [&>button]:min-h-12 [&>button]:flex-1 [&>button]:text-base">
            <button type="button" aria-pressed={method === 'card'} onClick={() => { setMethod('card'); setTendered(0) }}>
              <span className="inline-flex items-center gap-2"><Icon size={18}>{GLYPH.card}</Icon>Card</span>
            </button>
            <button type="button" aria-pressed={method === 'cash'} onClick={() => { setMethod('cash'); setTendered(0) }}>
              <span className="inline-flex items-center gap-2"><Icon size={18}>{GLYPH.cash}</Icon>Cash</span>
            </button>
          </div>
          <button type="button" onClick={onBack} className="btn btn-lg">Back to order</button>
        </div>

        {method === 'card' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-accent-tint text-accent"><Icon size={44} stroke={1.5}>{GLYPH.card}</Icon></div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Waiting for card</h2>
              <p className="mt-2 max-w-[420px] text-[15px] text-ink-2">
                Key <b className="num font-semibold text-ink">{money(due)}</b> into the Tyro terminal. When it shows approved, tap below.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-xl min-w-[320px]" onClick={() => pay(null)}>Approved on Tyro</button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <div className="text-sm font-medium text-muted">Cash tendered</div>
                <div className="num mt-1 text-[40px] font-semibold leading-tight tracking-[-0.02em]">{money(tendered)}</div>
              </div>
              <div className={`card p-4 ${tendered >= due ? 'border-accent-tint-line bg-accent-tint' : ''}`}>
                <div className={`text-sm font-medium ${tendered >= due ? 'text-accent' : 'text-muted'}`}>{tendered >= due ? 'Change due' : 'Still owing'}</div>
                <div className={`num mt-1 text-[40px] font-semibold leading-tight tracking-[-0.02em] ${tendered >= due ? 'text-accent' : ''}`}>{money(Math.abs(tendered - due))}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Quick label={`Exact ${money(due)}`} onTap={() => setTendered(due)} />
              {[2000, 5000, 10000, 20000].map((v) => <Quick key={v} label={'+' + money(v).replace('.00', '')} onTap={() => setTendered((x) => x + v)} />)}
              <Quick label="+$10" onTap={() => setTendered((x) => x + 1000)} />
            </div>
            <div className="flex-1" />
            <div className="mt-5 grid grid-cols-[200px_1fr] gap-3">
              <button type="button" className="btn btn-xl" onClick={() => setTendered(0)}>Clear</button>
              <button type="button" className="btn btn-primary btn-xl" disabled={tendered < due} onClick={() => pay(tendered)}>Complete sale</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Quick({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button type="button" onClick={onTap} className="btn num min-h-[72px] rounded-xl text-xl text-ink active:bg-accent-tint">
      {label}
    </button>
  )
}
