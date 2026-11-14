import { clockTime } from '../lib/dates'
import { money } from '../lib/money'
import { isPaid, nextStep, orderContext, statusLabel, totals, type Order, type Status } from '../lib/order'

/** Today's dockets, newest first. Orders sent to the kitchen unpaid stay here to be paid. */
export function Queue({ orders, onDocket, onAdvance, onPay, onNew }: {
  orders: Order[]
  onDocket: (o: Order) => void
  onAdvance: (o: Order, to: Status) => void
  onPay: (o: Order) => void
  onNew: () => void
}) {
  return (
    <div className="pos-scroll min-h-0 flex-1 px-[26px] pb-8 pt-6">
      <div className="flex items-end justify-between gap-4 border-b border-divider pb-3.5">
        <div>
          <h2 className="text-[28px] font-medium">Open orders</h2>
          <div className="meta mt-1">{orders.length} dockets today · one counter, one phone line</div>
        </div>
        <button className="btn btn-accent min-h-12 px-5 text-base" onClick={onNew}>New order</button>
      </div>
      {!orders.length && <div className="py-[70px] text-center italic text-neutral-700">No orders yet today.</div>}
      <div className="mt-5 grid grid-cols-3 gap-4">
        {orders.map((o) => {
          const paid = isPaid(o)
          const step = nextStep(o)
          // Food isn't handed over until it's paid for.
          const blocked = step.to === 'collected' && !paid
          return (
            <div key={o.id} className="flex flex-col gap-2.5 rounded-md border border-divider bg-neutral-100 px-4 pb-3.5 pt-4 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading text-[22px] font-semibold">#{o.number}</span>
                <span className="rounded-full border border-accent px-[9px] py-1 text-[10.5px] uppercase tracking-[0.14em] text-accent-800">
                  {statusLabel(o)}
                </span>
              </div>
              <div className="text-[13px] text-neutral-700">{orderContext(o.type, o.reference)}</div>
              <div className="h-px bg-divider" />
              <div className="text-[13px] leading-normal [text-wrap:pretty]">{o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</div>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-[11.5px] text-neutral-700">
                  {clockTime(o.createdAt)}{o.synced ? '' : o.error ? ' · not sent' : ' · on this iPad'}
                </span>
                <span className="font-heading text-[20px] text-accent-700">{money(totals(o.lines).subtotal)}</span>
              </div>
              <div className={`mt-1 grid gap-2 ${paid ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <button className="btn min-h-[46px] text-[14px]" onClick={() => onDocket(o)}>Docket</button>
                {!paid && <button className="btn btn-accent min-h-[46px] text-[14px]" onClick={() => onPay(o)}>Pay</button>}
                <button className={`btn min-h-[46px] text-[14px] ${paid ? 'btn-accent' : ''}`} disabled={blocked}
                  onClick={() => onAdvance(o, step.to)}>
                  {step.label}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
