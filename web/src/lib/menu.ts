// The menu as the till uses it: menu_snapshot() from the store app's database, with every
// price turned into whole cents so the till never adds up floating-point dollars.

export interface Option { id: string; name: string; price: number }
export interface Group { id: string; name: string; min: number; max: number; repeat: boolean; options: Option[] }
export interface Size { id: string; name: string; price: number }
export interface Item {
  id: string
  name: string
  description: string
  plu: string | null
  price: number | null       // null when it comes in sizes
  gstFree: boolean
  imageUrl: string | null
  sizes: Size[]
  groups: Group[]
  category: string
}
export interface Category { id: string; name: string; items: Item[] }
export interface Menu { businessId: string; takenAt: string; categories: Category[] }

// What menu_snapshot() returns: numeric columns arrive as JSON numbers in dollars.
interface RawOption { id: string; name: string; price: number }
interface RawGroup { id: string; name: string; min: number; max: number; repeat: boolean; options: RawOption[] }
interface RawItem {
  id: string; name: string; description: string | null; plu: string | null; price: number | null
  gst_free: boolean; image_url: string | null; sizes: RawOption[]; groups: RawGroup[]
}
export interface Snapshot { business_id: string; taken_at: string; categories: { id: string; name: string; items: RawItem[] }[] }

export const cents = (dollars: number | string) => Math.round(Number(dollars) * 100)

export function fromSnapshot(s: Snapshot): Menu {
  return {
    businessId: s.business_id,
    takenAt: s.taken_at,
    categories: s.categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        items: c.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description ?? '',
          plu: i.plu,
          price: i.price == null ? null : cents(i.price),
          gstFree: i.gst_free,
          imageUrl: i.image_url,
          sizes: i.sizes.map((z) => ({ id: z.id, name: z.name, price: cents(z.price) })),
          groups: i.groups
            .filter((g) => g.options.length > 0)
            .map((g) => ({ ...g, options: g.options.map((o) => ({ id: o.id, name: o.name, price: cents(o.price) })) })),
          category: c.name,
        })),
      }))
      .filter((c) => c.items.length > 0),
  }
}

/** The lowest price it sells for: its own, or its cheapest size. */
export const fromPrice = (it: Item) => it.price ?? Math.min(...it.sizes.map((s) => s.price))

/** What the tile's button says: straight in, pick a size, or answer its questions. */
export const tileHint = (it: Item) => (it.sizes.length ? 'Choose ›' : it.groups.length ? 'Options ›' : '+ Add')

/** Everything on the menu whose name or description has the search in it. */
export function searchMenu(menu: Menu, q: string): Item[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return []
  return menu.categories.flatMap((c) =>
    c.items.filter((i) => i.name.toLowerCase().includes(needle) || i.description.toLowerCase().includes(needle)),
  )
}
