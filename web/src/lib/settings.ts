// What this iPad is set up as. Kept in localStorage so the till opens straight into taking
// orders, with or without a connection.
import { useSyncExternalStore } from 'react'

export interface Settings {
  businessId: string
  businessName: string
  device: string            // printed on dockets and stored on each order: "Counter"
  staffName: string         // who signed the till in
  surchargePct: number      // card surcharge the till adds; 0 when the Tyro terminal adds its own
}

const KEY = 'till.settings'
const listeners = new Set<() => void>()
let cached: Settings | null | undefined

export function getSettings(): Settings | null {
  if (cached === undefined) {
    try { cached = JSON.parse(localStorage.getItem(KEY) || 'null') } catch { cached = null }
  }
  return cached ?? null
}

export function saveSettings(s: Settings | null) {
  cached = s
  if (s) localStorage.setItem(KEY, JSON.stringify(s))
  else localStorage.removeItem(KEY)
  listeners.forEach((f) => f())
}

export const updateSettings = (patch: Partial<Settings>) => {
  const s = getSettings()
  if (s) saveSettings({ ...s, ...patch })
}

export function useSettings() {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f) }, getSettings)
}

/** The next docket number on this till. Numbers run on; they don't restart each day. */
export function nextOrderNumber(): number {
  const n = Number(localStorage.getItem('till.seq') || '1001')
  localStorage.setItem('till.seq', String(n + 1))
  return n
}

export const peekOrderNumber = () => Number(localStorage.getItem('till.seq') || '1001')
