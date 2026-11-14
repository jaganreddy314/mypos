import { clockTime } from '../lib/dates'
import { money } from '../lib/money'
import { isPaid, nextStep, orderContext, statusLabel, totals, type Order, type Status } from '../lib/order'
import { GLYPH } from './glyphs'
import { Icon } from './icons'
import { Pill, type PillTone } from './ui'

const tone = (o: Order): PillTone =>
  !isPaid(o) ? 'warn' : o.status === 'preparing' ? 'info' : o.status === 'ready' ? 'success' : 'neutral'

/** Today's dockets, newest first. Orders sent to the kitchen unpaid stay here to be paid. */
export function Queue({ orders, onDocket, onAdvance, onPay, onNew }: {
  orders: Order[]
  onDocket: (o: Order) => void
  onAdvance: (o: Order, to: Status) => void
  onPay: (o: Order) => void
  onNew: () => void
}) {
  return (
    <div className="scroll min-h-0 flex-1 px-6 pb-8 pt-5">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Open orders</h1>
          <p className="mt-1 text-sm text-muted">{orders.length} orders today · {orders.filter((o) => !isPaid(o)).length} awaiting payment</p>
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={onNew}><Icon size={18} stroke={2}>{GLYPH.plus}</Icon>New order</button>
      </div>
      {!orders.length && <div className="card px-4 py-10 text-center text-sm text-muted">No orders yet today.</div>}
      <div className="grid grid-cols-3 gap-4">
        {orders.map((o) => {
          const paid = isPaid(o)
          const step = nextStep(o)
          // Food isn't handed over until it's paid for.
          const blocked = step.to === 'collected' && !paid
          return (
            <div key={o.id} className={`card flex flex-col gap-2.5 p-4 ${o.status === 'collected' ? 'opacity-70' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="num text-xl font-semibold">#{o.number}</span>
                <Pill tone={tone(o)}>{statusLabel(o)}</Pill>
              </div>
              <div className="text-sm text-ink-2">{orderContext(o.type, o.reference)}</div>
              <div className="border-t border-line-2 pt-2.5 text-sm leading-normal">{o.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</div>
              <div className="mt-auto flex items-baseline justify-between pt-1">
                <span className="text-xs text-muted">
                  {clockTime(o.createdAt)}{o.synced ? '' : o.error ? ' · not sent' : ' · on this iPad'}
                </span>
                <span className="num text-lg font-semibold">{money(totals(o.lines).subtotal)}</span>
              </div>
              <div className={`grid gap-2 ${paid ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <button type="button" className="btn min-h-11" onClick={() => onDocket(o)}>Docket</button>
                {!paid && <button type="button" className="btn btn-primary min-h-11" onClick={() => onPay(o)}>Pay</button>}
                <button type="button" className={`btn min-h-11 ${paid && o.status !== 'collected' ? 'btn-primary' : ''}`} disabled={blocked}
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
