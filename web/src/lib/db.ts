// The iPad's own copy of everything the till needs: the menu, and every order it has taken.
// Orders are written here first and sent to the database by sync.ts when it can, so a
// dropped connection never stops the counter.
import Dexie, { type EntityTable } from 'dexie'
import type { Menu } from './menu'
import type { Order } from './order'

interface Kept { key: string; value: unknown }

export const db = new Dexie('mypos') as Dexie & {
  orders: EntityTable<Order, 'id'>
  kept: EntityTable<Kept, 'key'>
}

db.version(1).stores({
  orders: 'id, saleDate, synced',
  kept: 'key',
})

export const saveMenu = (menu: Menu) => db.kept.put({ key: 'menu', value: menu })
export const loadMenu = async () => ((await db.kept.get('menu'))?.value as Menu | undefined) ?? null

/**
 * Saves a change to an order and marks it to be sent again. Its time only ever moves
 * forward, because the database keeps whichever version of an order is newest.
 */
export async function putOrder(o: Order) {
  const updatedAt = new Date(Math.max(Date.now(), (Date.parse(o.updatedAt) || 0) + 1)).toISOString()
  await db.orders.put({ ...o, updatedAt, synced: 0, error: undefined })
}
