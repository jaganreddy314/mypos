import { useState, type Dispatch, type SetStateAction } from 'react'
import { fromPrice, searchMenu, tileHint, type Item, type Menu } from '../lib/menu'
import { money } from '../lib/money'
import { ORDER_TYPES, lineDetail, lineTotal, totals } from '../lib/order'
import { peekOrderNumber } from '../lib/settings'
import { GLYPH } from './glyphs'
import { Icon } from './icons'
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
      <aside className="scroll flex w-[208px] flex-none flex-col gap-1 border-r border-line bg-surface px-3 pb-6 pt-3">
        <div className="px-2.5 pb-1 pt-1 text-[11px] font-medium uppercase tracking-[0.04em] text-faint">Menu</div>
        {menu.categories.map((c) => {
          const on = !q && c.id === cat?.id
          return (
            <button key={c.id} type="button" onClick={() => { setCatId(c.id); setSearch('') }}
              className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left font-medium ${on ? 'bg-accent-tint text-accent' : 'text-ink-2 hover:bg-surface-2'}`}>
              <span>{c.name}</span>
              <span className={`num text-xs ${on ? 'text-accent' : 'text-faint'}`}>{c.items.length}</span>
            </button>
          )
        })}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-none items-end gap-4 px-5 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">{q ? 'Search results' : cat?.name}</h1>
            <p className="mt-1 text-sm text-muted">{q ? `${items.length} items matching “${q}”` : `${items.length} items · tap to add`}</p>
          </div>
          <label className="relative w-[280px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"><Icon size={17}>{GLYPH.search}</Icon></span>
            <input className="field min-h-11 pl-10" type="search" placeholder="Search the whole menu" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        <div className="scroll min-h-0 flex-1 px-5 pb-6">
          <div className="grid grid-cols-3 gap-3">
            {items.map((it) => <Tile key={it.id} item={it} sub={it.description || (q ? it.category : '')} onTap={() => onAdd(it)} />)}
          </div>
          {!items.length && <div className="card px-4 py-10 text-center text-sm text-muted">Nothing matches that search.</div>}
        </div>
      </main>

      <Cart draft={draft} setDraft={setDraft} onClear={onClear} onSend={onSend} onPay={onPay} />
    </div>
  )
}

function Tile({ item, sub, onTap }: { item: Item; sub: string; onTap: () => void }) {
  return (
    <button type="button" onClick={onTap}
      className="card flex flex-col overflow-hidden text-left transition-colors hover:border-accent-tint-line active:bg-accent-tint">
      <div className="relative h-[96px] w-full flex-none bg-surface-2">
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          : <span className="absolute inset-0 grid place-items-center text-faint"><Icon size={28} stroke={1.5}>{GLYPH.bag}</Icon></span>}
      </div>
      <div className="flex min-h-[104px] w-full flex-1 flex-col gap-1 p-3">
        <span className="text-[15px] font-semibold leading-snug">{item.name}</span>
        <span className="line-clamp-2 text-xs leading-snug text-muted">{sub}</span>
        <span className="flex-1" />
        <span className="flex items-center justify-between gap-2 pt-1">
          <span className="num text-base font-semibold">
            {item.sizes.length ? <span className="text-xs font-medium text-muted">from </span> : null}{money(fromPrice(item))}
          </span>
          <span className="inline-flex min-h-8 items-center rounded-lg border border-accent-tint-line bg-accent-tint px-2.5 text-[13px] font-semibold text-accent">
            {tileHint(item)}
          </span>
        </span>
      </div>
    </button>
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
    <section className="flex min-h-0 w-[372px] flex-none flex-col border-l border-line bg-surface">
      <div className="border-b border-line px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Order <span className="num">#{peekOrderNumber()}</span></h2>
          <button type="button" onClick={onClear} disabled={empty} className="btn btn-sm min-h-9">Clear</button>
        </div>
        <div role="group" aria-label="Order type" className="seg seg-lg mt-3 w-full">
          {ORDER_TYPES.map((x) => (
            <button key={x.key} type="button" aria-pressed={draft.type === x.key}
              onClick={() => setDraft((d) => ({ ...d, type: x.key, reference: '' }))}>
              {x.label}
            </button>
          ))}
        </div>
        {type.placeholder && (
          <input className="field mt-2 min-h-11" placeholder={type.placeholder} value={draft.reference}
            onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))} />
        )}
      </div>

      <div className="scroll min-h-0 flex-1">
        {draft.lines.map((l) => (
          <div key={l.key} className="border-b border-line-2 px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{l.name}</span>
              <span className="num font-semibold">{money(lineTotal(l))}</span>
            </div>
            {lineDetail(l) && <div className="mt-0.5 text-xs leading-snug text-muted">{lineDetail(l)}</div>}
            <div className="mt-2 flex items-center gap-1.5">
              <button type="button" className="btn btn-icon rounded-lg" onClick={() => setQty(l.key, -1)} aria-label="One fewer"><Icon size={16} stroke={2}>{GLYPH.minus}</Icon></button>
              <span className="num min-w-7 text-center font-semibold">{l.qty}</span>
              <button type="button" className="btn btn-icon rounded-lg" onClick={() => setQty(l.key, 1)} aria-label="One more"><Icon size={16} stroke={2}>{GLYPH.plus}</Icon></button>
              <span className="flex-1" />
              <button type="button" onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((x) => x.key !== l.key) }))}
                className="btn btn-sm btn-danger min-h-11 border-transparent bg-transparent shadow-none" aria-label={`Remove ${l.name}`}>
                <Icon size={15} stroke={2}>{GLYPH.trash}</Icon>Remove
              </button>
            </div>
          </div>
        ))}
        {empty && (
          <div className="px-6 py-16 text-center text-sm text-muted">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-faint"><Icon size={22}>{GLYPH.receipt}</Icon></div>
            No items yet.<br />Tap a menu item to start the order.
          </div>
        )}
      </div>

      <div className="border-t border-line px-4 pb-4 pt-3">
        <Row className="text-sm text-muted" label={`Subtotal · ${t.count} items`} value={money(t.subtotal)} />
        <Row className="mt-1 text-sm text-muted" label="Incl. GST" value={money(t.gst)} />
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-base font-semibold">Total</span>
          <span className="num text-[30px] font-semibold tracking-[-0.02em]">{money(t.subtotal)}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-lg" disabled={empty} onClick={onSend}><Icon size={18} stroke={2}>{GLYPH.chef}</Icon>Send to kitchen</button>
          <button type="button" className="btn btn-primary btn-lg" disabled={empty} onClick={onPay}>Pay {empty ? '' : money(t.subtotal)}</button>
        </div>
      </div>
    </section>
  )
}
