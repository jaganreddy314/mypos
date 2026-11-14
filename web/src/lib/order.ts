// Orders, lines and the money in them. Everything here is in whole cents and has no side
// effects, so it can be tested on its own (order.test.ts).
import type { Group, Item } from './menu'

export type OrderType = 'takeaway' | 'dine_in' | 'phone'
export type Status = 'preparing' | 'ready' | 'collected'

export const ORDER_TYPES: { key: OrderType; label: string; placeholder?: string }[] = [
  { key: 'takeaway', label: 'Takeaway' },
  { key: 'dine_in', label: 'Dine-in', placeholder: 'Table number' },
  { key: 'phone', label: 'Phone', placeholder: 'Customer name · pickup time' },
]

/** One answer on a line: "Battered", or "6 × Battered" when a pack asked it six times. */
export interface LineOption { group: string; name: string; price: number; qty: number }

export interface Line {
  key: string
  menuItemId: string | null
  sizeId: string | null
  name: string
  size: string | null
  options: LineOption[]
  note: string
  qty: number
  unit: number                // the price of one, frozen when it was added
  gstFree: boolean
}

export interface Payment {
  id: string
  method: 'card' | 'cash'
  amount: number              // what it paid off the order
  surcharge: number           // card surcharge on top
  tendered: number | null     // cash handed over
  takenAt: string
}

export interface Order {
  id: string
  businessId: string
  number: number
  device: string
  type: OrderType
  reference: string
  status: Status
  saleDate: string
  createdAt: string
  updatedAt: string
  lines: Line[]
  payments: Payment[]
  synced: 0 | 1               // 0 until the database has this version of it
  error?: string
}

// ---------- answering an item's questions ----------

/** The size question, shown first for items that come in sizes. */
export const SIZE_GROUP = 'size'

/** Which options are chosen in each group, in the order they were tapped. Repeats allowed. */
export type Selection = Record<string, string[]>

/**
 * A tap on an option. One-choice groups swap; a group that allows several drops the oldest
 * pick once it's full, so the newest tap always counts. A pack that asks the same question
 * n times ("Cook option" for 12 pieces) fills every piece with the first pick, and each later
 * tap swaps one of the others for it: Crumbed, then Battered ×6, is six of each.
 */
export function tapOption(g: Group, cur: string[], id: string): string[] {
  if (g.repeat) {
    if (cur.length === 0 && g.min === g.max && g.max > 1) return Array(g.max).fill(id)
    const next = [...cur, id]
    if (next.length > g.max) {
      const other = next.findIndex((x) => x !== id)
      next.splice(other >= 0 ? other : 0, 1)
    }
    return next
  }
  if (cur.includes(id)) return g.min >= 1 && g.max === 1 ? cur : cur.filter((x) => x !== id)
  if (g.max === 1) return [id]
  const next = [...cur, id]
  if (next.length > g.max) next.shift()
  return next
}

/** Takes one of this option back out of a group that can repeat. */
export function removeOne(cur: string[], id: string): string[] {
  const i = cur.lastIndexOf(id)
  return i < 0 ? cur : [...cur.slice(0, i), ...cur.slice(i + 1)]
}

/** The small print beside a group's name: what it needs. */
export function ruleNote(g: Pick<Group, 'min' | 'max' | 'repeat'>): string {
  if (g.min === g.max) return g.max > 1 && g.repeat ? `Required · choose ${g.max} · first pick fills all` : `Required · choose ${g.max}`
  if (g.min === 0) return g.max === 1 ? 'Optional · choose 1' : `Choose up to ${g.max}`
  return `Choose ${g.min} to ${g.max}`
}

/** The item's questions as the panel asks them: its size first, then its option groups. */
export function questions(it: Item): Group[] {
  const gs = [...it.groups]
  if (it.sizes.length) {
    gs.unshift({ id: SIZE_GROUP, name: 'Size', min: 1, max: 1, repeat: false, options: it.sizes })
  }
  return gs
}

/** The first question still short of answers, with how it should be asked for. */
export function missing(it: Item, sel: Selection): string | null {
  for (const g of questions(it)) {
    const n = (sel[g.id] ?? []).length
    if (n < g.min) return g.min - n < g.min ? `Choose ${g.min - n} more · ${g.name.toLowerCase()}` : `Choose ${g.name.toLowerCase()}`
  }
  return null
}

/** The price of one: the size replaces the item's price, and options add to it. */
export function unitPrice(it: Item, sel: Selection): number {
  const size = it.sizes.find((s) => s.id === sel[SIZE_GROUP]?.[0])
  let unit = size ? size.price : (it.price ?? 0)
  for (const g of it.groups) {
    for (const id of sel[g.id] ?? []) unit += g.options.find((o) => o.id === id)?.price ?? 0
  }
  return unit
}

/** Turns the panel's answers into a cart line. */
export function makeLine(it: Item, sel: Selection, qty: number, note: string, key: string): Line {
  const size = it.sizes.find((s) => s.id === sel[SIZE_GROUP]?.[0]) ?? null
  const options: LineOption[] = []
  for (const g of it.groups) {
    const picked = sel[g.id] ?? []
    for (const o of g.options) {
      const n = picked.filter((x) => x === o.id).length
      if (n) options.push({ group: g.name, name: o.name, price: o.price, qty: n })
    }
  }
  return {
    key,
    menuItemId: it.id,
    sizeId: size?.id ?? null,
    name: it.name,
    size: size?.name ?? null,
    options,
    note: note.trim(),
    qty,
    unit: unitPrice(it, sel),
    gstFree: it.gstFree,
  }
}

const sameKind = (a: Line, b: Line) =>
  a.menuItemId === b.menuItemId && a.sizeId === b.sizeId && a.note === b.note && a.unit === b.unit &&
  JSON.stringify(a.options) === JSON.stringify(b.options)

/** Adds a line to the cart, or adds to the quantity of an identical one already there. */
export function addLine(cart: Line[], line: Line): Line[] {
  const i = cart.findIndex((l) => sameKind(l, line))
  if (i < 0) return [...cart, line]
  return cart.map((l, j) => (j === i ? { ...l, qty: l.qty + line.qty } : l))
}

/** "Large · 6 × Crumbed · 6 × Battered · Note: no salt" */
export function lineDetail(l: Pick<Line, 'size' | 'options' | 'note'>): string {
  const parts = [
    ...(l.size ? [l.size] : []),
    ...l.options.map((o) => (o.qty > 1 ? `${o.qty} × ${o.name}` : o.name)),
  ]
  if (l.note) parts.push('Note: ' + l.note)
  return parts.join(' · ')
}

// ---------- money ----------

export const lineTotal = (l: Pick<Line, 'unit' | 'qty'>) => l.unit * l.qty

export function totals(lines: Line[]) {
  const subtotal = lines.reduce((a, l) => a + lineTotal(l), 0)
  // Prices include GST, so it's a tenth of the price before it: 1/11 of what's charged.
  const taxable = lines.reduce((a, l) => a + (l.gstFree ? 0 : lineTotal(l)), 0)
  return { subtotal, gst: Math.round(taxable / 11), count: lines.reduce((a, l) => a + l.qty, 0) }
}

export const paidOf = (o: Pick<Order, 'payments'>) => o.payments.reduce((a, p) => a + p.amount, 0)
export const owing = (o: Pick<Order, 'lines' | 'payments'>) => Math.max(0, totals(o.lines).subtotal - paidOf(o))
export const isPaid = (o: Pick<Order, 'lines' | 'payments'>) => owing(o) === 0

/** The card surcharge on an amount, at a percentage set on this till. */
export const surchargeOf = (amount: number, pct: number) => Math.round((amount * pct) / 100)

/** Cash is paid to the nearest 5 cents; there are no 1c or 2c coins. */
export const cashDue = (amount: number) => Math.round(amount / 5) * 5

// ---------- the order in the kitchen ----------

export function orderContext(type: OrderType, reference: string): string {
  if (type === 'dine_in') return 'Dine-in · ' + (reference || 'no table set')
  if (type === 'phone') return 'Phone order · ' + (reference || 'no name set')
  return 'Takeaway · counter pickup'
}

/** What the queue card's pill says. */
export function statusLabel(o: Pick<Order, 'status' | 'lines' | 'payments'>): string {
  if (o.status === 'preparing') return isPaid(o) ? 'Preparing' : 'Awaiting payment'
  if (o.status === 'ready') return isPaid(o) ? 'Ready' : 'Ready · not paid'
  return 'Collected'
}

/** The queue card's advance button: its label and the status it moves to. */
export function nextStep(o: Pick<Order, 'status'>): { label: string; to: Status } {
  if (o.status === 'preparing') return { label: 'Mark ready', to: 'ready' }
  if (o.status === 'ready') return { label: 'Hand over', to: 'collected' }
  return { label: 'Reopen', to: 'preparing' }
}
