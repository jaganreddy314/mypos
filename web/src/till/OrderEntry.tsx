import { useState, type Dispatch, type SetStateAction } from 'react'
import { fromPrice, searchMenu, tileHint, type Item, type Menu } from '../lib/menu'
import { money } from '../lib/money'
import { ORDER_TYPES, lineDetail, lineTotal, totals } from '../lib/order'
import { peekOrderNumber } from '../lib/settings'
import type { Draft } from './Till'
import { Row } from './ui'

export function OrderEntry({ menu, draft, setDraft, onAdd, onClear, onSend, onPay }: {
  menu: Menu
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft>>
  onAdd: (it: Item) => void
  onClear: () => void
  onSend: () => void
  onPay: () => void
}) {
  const [catId, setCatId] = useState(menu.categories[0]?.id)
  const [search, setSearch] = useState('')
  const q = search.trim()
  const cat = menu.categories.find((c) => c.id === catId) ?? menu.categories[0]
  const items = q ? searchMenu(menu, q) : (cat?.items ?? [])

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="pos-scroll w-[198px] flex-none border-r border-divider pb-6 pt-2.5">
        <div className="kicker px-4 pb-2.5 pt-2">Our menu</div>
        {menu.categories.map((c) => {
          const on = !q && c.id === cat?.id
          return (
            <button key={c.id} onClick={() => { setCatId(c.id); setSearch('') }}
              className={`block min-h-[46px] w-full border-l-[3px] px-4 py-2.5 text-left font-heading text-base font-semibold leading-tight ${on ? 'border-accent bg-accent-100 text-accent-800' : 'border-transparent hover:bg-neutral-200'}`}>
              {c.name}
            </button>
          )
        })}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-none items-end gap-4 border-b border-divider px-[22px] pb-3.5 pt-[18px]">
          <div className="min-w-0 flex-1">
            <h2 className="text-[28px] font-medium">{q ? 'Search results' : cat?.name}</h2>
            <div className="meta mt-1">{q ? `${items.length} items matching “${q}”` : `${items.length} items · tap to add`}</div>
          </div>
          <input className="field w-[260px]" type="search" placeholder="Search the whole menu" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="pos-scroll min-h-0 flex-1 px-[22px] pb-7 pt-[18px]">
          <div className="grid grid-cols-3 gap-3.5">
            {items.map((it) => <Tile key={it.id} item={it} sub={it.description || (q ? it.category : '')} onTap={() => onAdd(it)} />)}
          </div>
          {!items.length && <div className="py-[60px] text-center italic text-neutral-700">Nothing matches that search.</div>}
        </div>
      </main>

      <Cart draft={draft} setDraft={setDraft} onClear={onClear} onSend={onSend} onPay={onPay} />
    </div>
  )
}

function Tile({ item, sub, onTap }: { item: Item; sub: string; onTap: () => void }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-divider bg-neutral-100 shadow-sm">
      <div className="relative h-[92px] flex-none border-b border-divider bg-surface">
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          : <span className="absolute inset-0 grid place-items-center font-heading text-[13px] uppercase tracking-[0.16em] text-neutral-700">Fish Lips</span>}
      </div>
      <button onClick={onTap}
        className="flex min-h-[96px] flex-1 flex-col items-stretch gap-1.5 px-[13px] pb-[13px] pt-3 text-left hover:bg-accent-100 active:bg-accent-200">
        <span className="font-heading text-[17px] font-semibold leading-[1.15]">{item.name}</span>
        <span className="text-[11.5px] leading-[1.35] text-neutral-700 [text-wrap:pretty]">{sub}</span>
        <span className="flex-1" />
        <span className="flex items-center justify-between gap-2">
          <span className="font-heading text-[19px] text-accent-700">{item.sizes.length ? 'from ' : ''}{money(fromPrice(item))}</span>
          <span className="inline-flex min-h-9 items-center whitespace-nowrap rounded-md border border-accent px-[13px] font-heading text-[14px] font-semibold text-accent-800">
            {tileHint(item)}
          </span>
        </span>
      </button>
    </div>
  )
}

function Cart({ draft, setDraft, onClear, onSend, onPay }: {
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft>>
  onClear: () => void
  onSend: () => void
  onPay: () => void
}) {
  const t = totals(draft.lines)
  const empty = draft.lines.length === 0
  const type = ORDER_TYPES.find((x) => x.key === draft.type)!
  const setQty = (key: string, by: number) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, qty: Math.max(1, l.qty + by) } : l)) }))

  return (
    <section className="flex min-h-0 w-[360px] flex-none flex-col border-l border-divider bg-neutral-100">
      <div className="border-b border-divider px-[18px] pb-3.5 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-heading text-[20px] font-semibold">Order #{peekOrderNumber()}</span>
          <button onClick={onClear} disabled={empty} className="btn btn-quiet min-h-9 px-2.5 text-[13px] font-normal">Clear</button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {ORDER_TYPES.map((x) => (
            <button key={x.key} onClick={() => setDraft((d) => ({ ...d, type: x.key, reference: '' }))}
              className={`btn min-h-[46px] text-[14px] ${draft.type === x.key ? 'btn-accent' : 'btn-quiet'}`}>
              {x.label}
            </button>
          ))}
        </div>
        {type.placeholder && (
          <input className="field mt-2 bg-bg" placeholder={type.placeholder} value={draft.reference}
            onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))} />
        )}
      </div>

      <div className="pos-scroll min-h-0 flex-1 py-1.5">
        {draft.lines.map((l) => (
          <div key={l.key} className="border-b border-divider px-[18px] py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-heading text-base font-semibold">{l.name}</span>
              <span className="font-heading text-base">{money(lineTotal(l))}</span>
            </div>
            <div className="mt-0.5 text-[11.5px] leading-[1.4] text-neutral-700">{lineDetail(l)}</div>
            <div className="mt-2 flex items-center gap-2">
              <button className="btn-step h-[34px] w-[34px] text-[18px]" onClick={() => setQty(l.key, -1)} aria-label="One fewer">−</button>
              <span className="min-w-[22px] text-center font-heading text-base">{l.qty}</span>
              <button className="btn-step h-[34px] w-[34px] text-[18px]" onClick={() => setQty(l.key, 1)} aria-label="One more">+</button>
              <span className="flex-1" />
              <button onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((x) => x.key !== l.key) }))}
                className="min-h-[34px] rounded-md px-2.5 text-[12px] uppercase tracking-[0.06em] text-neutral-700 hover:text-accent-700">
                Remove
              </button>
            </div>
          </div>
        ))}
        {empty && (
          <div className="px-[26px] py-[70px] text-center italic leading-[1.6] text-neutral-700">
            No items yet.<br />Tap a menu tile to start the docket.
          </div>
        )}
      </div>

      <div className="border-t border-divider px-[18px] pb-[18px] pt-3.5">
        <Row className="text-[13.5px] text-neutral-700" label={`Subtotal · ${t.count} items`} value={money(t.subtotal)} />
        <Row className="mt-1 text-[13.5px] text-neutral-700" label="Incl. GST" value={money(t.gst)} />
        <div className="my-3 h-px bg-divider" />
        <div className="flex items-baseline justify-between">
          <span className="font-heading text-[18px]">Total</span>
          <span className="font-heading text-[32px] text-accent-700">{money(t.subtotal)}</span>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button className="btn min-h-[52px] text-[15px]" disabled={empty} onClick={onSend}>Send to kitchen</button>
          <button className="btn btn-accent min-h-[52px] text-[17px]" disabled={empty} onClick={onPay}>Pay</button>
        </div>
      </div>
    </section>
  )
}
