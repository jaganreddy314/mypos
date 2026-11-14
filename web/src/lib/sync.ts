// Sends orders taken on this iPad to the database. Each one goes with submit_pos_order,
// which is safe to repeat, so an order is simply sent again until it has gone through.
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, putOrder, saveMenu } from './db'
import { fromSnapshot, type Menu, type Snapshot } from './menu'
import { supabase } from './supabase'
import type { Order } from './order'

export type SyncStatus = 'online' | 'sending' | 'offline' | 'signin' | 'error'

const dollars = (c: number | null) => (c == null ? null : c / 100)

/** The order as submit_pos_order takes it: dollars, and the database's names. */
export function toPayload(o: Order) {
  return {
    id: o.id,
    business_id: o.businessId,
    number: o.number,
    device: o.device,
    order_type: o.type,
    reference: o.reference,
    status: o.status,
    sale_date: o.saleDate,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    lines: o.lines.map((l) => ({
      menu_item_id: l.menuItemId,
      size_id: l.sizeId,
      name: l.name,
      size: l.size,
      options: l.options.map((x) => ({ ...x, price: dollars(x.price) })),
      note: l.note,
      qty: l.qty,
      unit_price: dollars(l.unit),
      gst_free: l.gstFree,
    })),
    payments: o.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: dollars(p.amount),
      surcharge: dollars(p.surcharge),
      tendered: dollars(p.tendered),
      taken_at: p.takenAt,
    })),
  }
}

let running: Promise<SyncStatus> | null = null
let again = false
const listeners = new Set<(s: SyncStatus) => void>()
let last: SyncStatus = 'online'
const report = (s: SyncStatus) => { last = s; listeners.forEach((f) => f(s)); return s }

/** Sends every order that has changed since it was last sent. */
export function pushOrders(): Promise<SyncStatus> {
  if (running) { again = true; return running }
  running = push().finally(() => {
    running = null
    if (again) { again = false; void pushOrders() }
  })
  return running
}

/** Saves a change to an order on the iPad, then sends it. */
export async function saveOrder(o: Order) {
  await putOrder(o)
  void pushOrders()
}

/** Fetches the latest menu and keeps it on the iPad. */
export async function refreshMenu(businessId: string): Promise<Menu> {
  const { data, error } = await supabase.rpc('menu_snapshot', { p_business: businessId })
  if (error) throw new Error(error.message)
  const menu = fromSnapshot(data as Snapshot)
  await saveMenu(menu)
  return menu
}

async function push(): Promise<SyncStatus> {
  if (!navigator.onLine) return report('offline')
  const waiting = await db.orders.where('synced').equals(0).toArray()
  if (!waiting.length) return report('online')
  const { data } = await supabase.auth.getSession()
  if (!data.session) return report('signin')
  report('sending')
  let failed = false
  for (const o of waiting) {
    const { error } = await supabase.rpc('submit_pos_order', { p_order: toPayload(o) })
    if (error) {
      if (/fetch|network|load failed/i.test(error.message)) return report('offline')
      if (error.code === 'PGRST301' || /jwt/i.test(error.message)) return report('signin')
      failed = true
      await db.orders.update(o.id, { error: error.message })
      continue
    }
    // Only mark it sent if nobody changed it on the till while it was on its way.
    await db.orders.where('id').equals(o.id).modify((x) => {
      if (x.updatedAt === o.updatedAt) { x.synced = 1; delete x.error }
    })
  }
  return report(failed ? 'error' : 'online')
}

/** Keeps orders flowing out: now, whenever the connection comes back, and every 20 seconds. */
export function useSync() {
  const [status, setStatus] = useState<SyncStatus>(last)
  const waiting = useLiveQuery(() => db.orders.where('synced').equals(0).count(), [], 0)

  useEffect(() => {
    listeners.add(setStatus)
    void pushOrders()
    const kick = () => void pushOrders()
    const offline = () => report('offline')
    window.addEventListener('online', kick)
    window.addEventListener('offline', offline)
    const t = setInterval(kick, 20_000)
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === 'SIGNED_IN' || e === 'TOKEN_REFRESHED') kick() })
    return () => {
      listeners.delete(setStatus)
      window.removeEventListener('online', kick)
      window.removeEventListener('offline', offline)
      clearInterval(t)
      data.subscription.unsubscribe()
    }
  }, [])

  return { status, waiting }
}
