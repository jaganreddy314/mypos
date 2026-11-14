import { clockTime } from '../lib/dates'
import { money } from '../lib/money'
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
    <div className={printable ? 'bg-white text-black' : 'pos-scroll max-h-full w-[404px] animate-slide border border-divider bg-docket px-[30px] pb-[22px] pt-7 shadow-lg'}
      onClick={(e) => e.stopPropagation()}>
      <div className="border-b border-dashed border-neutral-400 pb-3.5 text-center">
        <div className="font-heading text-[24px] uppercase tracking-[0.16em]">Fish Lips</div>
        <div className="mt-[3px] text-[11px] tracking-[0.1em] text-neutral-700">Shop 1/219 Main Street, Samford QLD</div>
        <div className="text-[11px] tracking-[0.1em] text-neutral-700">07 3924 9174</div>
      </div>
      <div className="flex justify-between border-b border-dashed border-neutral-400 py-3 text-[12.5px]">
        <span>#{o.number}</span><span>{clockTime(o.createdAt)}</span>
      </div>
      <div className="pb-2.5 pt-3 font-heading text-[19px] font-semibold">
        {kind === 'kitchen' ? 'KITCHEN · ' : ''}{orderContext(o.type, o.reference)}
      </div>
      {o.lines.map((l) => (
        <div key={l.key} className="border-t border-dotted border-neutral-400 py-2">
          <div className="flex justify-between gap-2.5 text-[14px]">
            <span className="font-medium">{l.qty} × {l.name}</span><span>{money(lineTotal(l))}</span>
          </div>
          {lineDetail(l) && <div className="pl-3.5 text-[11.5px] text-neutral-700">{lineDetail(l)}</div>}
        </div>
      ))}
      <div className="mt-3 border-t border-dashed border-neutral-400 pt-3">
        <div className="flex justify-between text-[12.5px] text-neutral-700"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
        {surcharge > 0 && <div className="mt-[3px] flex justify-between text-[12.5px] text-neutral-700"><span>Card surcharge</span><span>{money(surcharge)}</span></div>}
        <div className="mt-[3px] flex justify-between text-[12.5px] text-neutral-700"><span>GST included</span><span>{money(t.gst)}</span></div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="font-heading text-[17px]">{paid ? 'Paid' : 'Total'}</span>
          <span className="font-heading text-[26px]">{money(t.subtotal + surcharge)}</span>
        </div>
        <div className="mt-1.5 text-[12px] text-neutral-700">{tenderLine(o, kind)}</div>
      </div>
      <div className="mt-[18px] border-t border-dashed border-neutral-400 pt-3.5 text-center text-[11.5px] italic text-neutral-700">
        Where every bite is a splash of delight
      </div>
      {!printable && (
        <div className="mt-[18px] grid grid-cols-2 gap-2">
          <button className="btn min-h-12 text-[15px]" onClick={onClose}>Close</button>
          <button className="btn btn-accent min-h-12 text-[15px]" onClick={onPrint}>Print docket</button>
        </div>
      )}
    </div>
  )
  if (printable) return sheet
  return (
    <div className="absolute inset-0 z-50 flex animate-fade items-start justify-center bg-[color-mix(in_srgb,#201f1d_40%,transparent)] py-12" onClick={onClose}>
      {sheet}
    </div>
  )
}
