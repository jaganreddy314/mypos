// Taking payment. Card is paid on the Tyro terminal: the amount is keyed in there, and the
// till is told it went through. (Sending the amount to the terminal directly comes with Tyro's
// integration.) Cash works out the change, to the nearest 5 cents.
import { useState } from 'react'
import { money } from '../lib/money'
import { cashDue, lineDetail, lineTotal, orderContext, paidOf, surchargeOf, totals, type Line, type OrderType, type Payment as Paid } from '../lib/order'
import { peekOrderNumber } from '../lib/settings'
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

  const tab = (m: 'card' | 'cash', label: string) => (
    <button onClick={() => { setMethod(m); setTendered(0) }}
      className={`btn min-h-[60px] flex-1 text-[19px] ${method === m ? 'btn-accent' : 'btn-quiet'}`}>
      {label}
    </button>
  )

  return (
    <div className="absolute inset-0 z-40 flex animate-fade bg-bg">
      <div className="flex w-[470px] flex-none flex-col border-r border-divider bg-neutral-100">
        <div className="border-b border-divider px-[26px] pb-[18px] pt-6">
          <div className="kicker">Taking payment</div>
          <h2 className="mt-1.5 text-[30px] font-medium">Order #{number ?? peekOrderNumber()}</h2>
          <div className="mt-1 text-[13px] text-neutral-700">{orderContext(type, reference)} · {t.count} items</div>
        </div>
        <div className="pos-scroll min-h-0 flex-1 px-[26px] py-2">
          {lines.map((l) => (
            <div key={l.key} className="border-b border-divider py-3">
              <div className="flex justify-between gap-2.5">
                <span className="font-heading text-base font-semibold">{l.qty} × {l.name}</span>
                <span className="font-heading text-base">{money(lineTotal(l))}</span>
              </div>
              <div className="mt-0.5 text-[11.5px] text-neutral-700">{lineDetail(l)}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-divider px-[26px] pb-6 pt-[18px]">
          <Row className="text-[13.5px] text-neutral-700" label="Subtotal" value={money(t.subtotal)} />
          {owing !== t.subtotal && <Row className="mt-1 text-[13.5px] text-neutral-700" label="Already paid" value={money(t.subtotal - owing)} />}
          {surcharge > 0
            ? <Row className="mt-1 text-[13.5px] text-neutral-700" label={`Card surcharge ${surchargePct}%`} value={money(surcharge)} />
            : <Row className="mt-1 text-[13.5px] text-neutral-700" label="Incl. GST" value={money(t.gst)} />}
          {method === 'cash' && due !== owing && <Row className="mt-1 text-[13.5px] text-neutral-700" label="Rounded for cash" value={money(due - owing)} />}
          <div className="my-3 h-px bg-divider" />
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-[20px]">Amount due</span>
            <span className="font-heading text-[38px] text-accent-700">{money(due)}</span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-divider px-[26px] pb-[18px] pt-[22px]">
          {tab('card', 'Card')}
          {tab('cash', 'Cash')}
          <button onClick={onBack} className="btn btn-quiet min-h-[60px] px-5 text-base">Back to order</button>
        </div>

        {method === 'card' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-[22px] p-10">
            <div className="relative flex h-[132px] w-[210px] items-center justify-center rounded-lg border border-accent">
              <div className="h-10 w-[54px] rounded-[4px] border border-accent-400" />
              <div className="absolute bottom-3 right-3.5 text-[10px] uppercase tracking-[0.18em] text-neutral-700">Tap · insert · swipe</div>
            </div>
            <div className="text-center">
              <div className="font-heading text-[30px] font-medium">Waiting for card</div>
              <div className="mt-1.5 text-[14px] text-neutral-700">Key <b className="font-medium text-ink">{money(due)}</b> into the Tyro terminal. When it shows approved, tap below.</div>
            </div>
            <button className="btn btn-accent min-h-16 px-11 text-[20px]" onClick={() => pay(null)}>
              Approved on Tyro
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-[26px] pb-[26px] pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-700">Cash tendered</div>
                <div className="font-heading text-[46px] leading-[1.1]">{money(tendered)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-700">{tendered >= due ? 'Change due' : 'Still owing'}</div>
                <div className="font-heading text-[46px] leading-[1.1] text-accent-700">{money(Math.abs(tendered - due))}</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Quick label={`Exact ${money(due)}`} onTap={() => setTendered(due)} />
              {[2000, 5000, 10000, 20000].map((v) => <Quick key={v} label={money(v).replace('.00', '')} onTap={() => setTendered((x) => x + v)} />)}
              <Quick label="+$10" onTap={() => setTendered((x) => x + 1000)} />
            </div>
            <div className="flex-1" />
            <div className="mt-5 grid grid-cols-[200px_1fr] gap-3">
              <button className="btn min-h-16 text-[17px]" onClick={() => setTendered(0)}>Clear</button>
              <button className="btn btn-accent min-h-16 text-[21px]" disabled={tendered < due} onClick={() => pay(tendered)}>
                Complete sale
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Quick({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button onClick={onTap}
      className="min-h-[76px] rounded-md border border-divider bg-neutral-100 font-heading text-[24px] font-semibold hover:bg-accent-100 active:bg-accent-200">
      {label}
    </button>
  )
}
