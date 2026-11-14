import { clockTime } from '../lib/dates'
import { money } from '../lib/money'
import { GLYPH } from './glyphs'
import { Icon } from './icons'
import { cashDue, isPaid, lineDetail, lineTotal, orderContext, totals, type Order } from '../lib/order'

export type DocketKind = 'kitchen' | 'receipt'

/** How it was paid, as the docket's last line says it. */
function tenderLine(o: Order, kind: DocketKind): string {
  if (!o.payments.length) return kind === 'kitchen' ? 'Not yet paid — docket sent to kitchen' : 'Awaiting payment at the counter'
  return o.payments.map((p) => p.method === 'card'
    ? `Paid by card on Tyro · ${money(p.amount + p.surcharge)}`
    : `Cash ${money(p.tendered ?? 0)} · change ${money((p.tendered ?? 0) - cashDue(p.amount))}`).join(' · ')
}

/** The docket as an 80mm thermal roll would print it: for the kitchen, or the customer's receipt. */
export function Docket({ order: o, kind, onClose, onPrint, printable }: {
  order: Order
  kind: DocketKind
  onClose?: () => void
  onPrint?: () => void
  printable?: boolean
}) {
  const t = totals(o.lines)
  const surcharge = o.payments.reduce((a, p) => a + p.surcharge, 0)
  const paid = isPaid(o)
  const sheet = (
    <div className={printable ? 'bg-white text-black' : 'scroll max-h-full w-[400px] animate-slide rounded-2xl border border-line bg-surface px-7 pb-6 pt-7 shadow-[var(--shadow-float)]'}
      onClick={(e) => e.stopPropagation()}>
      <div className="border-b border-dashed border-input-line pb-3.5 text-center">
        <div className="text-xl font-bold uppercase tracking-[0.12em]">Fish Lips</div>
        <div className="mt-[3px] text-[11px] tracking-[0.1em] text-muted">Shop 1/219 Main Street, Samford QLD</div>
        <div className="text-[11px] tracking-[0.1em] text-muted">07 3924 9174</div>
      </div>
      <div className="flex justify-between border-b border-dashed border-input-line py-3 text-[12.5px]">
        <span>#{o.number}</span><span>{clockTime(o.createdAt)}</span>
      </div>
      <div className="pb-2.5 pt-3 text-base font-semibold">
        {kind === 'kitchen' ? 'KITCHEN · ' : ''}{orderContext(o.type, o.reference)}
      </div>
      {o.lines.map((l) => (
        <div key={l.key} className="border-t border-dotted border-input-line py-2">
          <div className="flex justify-between gap-2.5 text-[14px]">
            <span className="font-semibold">{l.qty} × {l.name}</span><span className="num">{money(lineTotal(l))}</span>
          </div>
          {lineDetail(l) && <div className="pl-3.5 text-[11.5px] text-muted">{lineDetail(l)}</div>}
        </div>
      ))}
      <div className="mt-3 border-t border-dashed border-input-line pt-3">
        <div className="flex justify-between text-[12.5px] text-muted"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
        {surcharge > 0 && <div className="mt-[3px] flex justify-between text-[12.5px] text-muted"><span>Card surcharge</span><span>{money(surcharge)}</span></div>}
        <div className="mt-[3px] flex justify-between text-[12.5px] text-muted"><span>GST included</span><span>{money(t.gst)}</span></div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-base font-semibold">{paid ? 'Paid' : 'Total'}</span>
          <span className="num text-2xl font-semibold">{money(t.subtotal + surcharge)}</span>
        </div>
        <div className="mt-1.5 text-[12px] text-muted">{tenderLine(o, kind)}</div>
      </div>
      <div className="mt-[18px] border-t border-dashed border-input-line pt-3.5 text-center text-[11.5px] italic text-muted">
        Where every bite is a splash of delight
      </div>
      {!printable && (
        <div className="mt-[18px] grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-lg" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={onPrint}><Icon size={18} stroke={2}>{GLYPH.printer}</Icon>Print docket</button>
        </div>
      )}
    </div>
  )
  if (printable) return sheet
  return (
    <div className="absolute inset-0 z-50 flex animate-fade items-start justify-center bg-[rgba(16,24,40,0.4)] py-12" onClick={onClose}>
      {sheet}
    </div>
  )
}
