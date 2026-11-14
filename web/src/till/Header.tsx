import { clockTime } from '../lib/dates'
import type { SyncStatus } from '../lib/sync'
import { useTheme } from './hooks'
import { GLYPH } from './glyphs'
import { Icon } from './icons'
import { BusinessTile, Pill, type PillTone } from './ui'

/** What the status pill says: the connection, and whether orders are waiting on the iPad. */
function syncPill(status: SyncStatus, waiting: number): { text: string; tone: PillTone } {
  if (status === 'offline') return { text: waiting ? `Offline · ${waiting} saved here` : 'Offline', tone: 'warn' }
  if (status === 'signin') return { text: `Sign in to send ${waiting}`, tone: 'danger' }
  if (status === 'error' && waiting) return { text: `${waiting} not sent`, tone: 'danger' }
  if (waiting) return { text: `Sending ${waiting}`, tone: 'info' }
  return { text: 'Online', tone: 'success' }
}

export function Header({ business, device, screen, onScreen, openCount, now, staff, sync, onSettings }: {
  business: string
  device: string
  screen: 'order' | 'queue'
  onScreen: (s: 'order' | 'queue') => void
  openCount: number
  now: Date
  staff: string
  sync: { status: SyncStatus; waiting: number }
  onSettings: () => void
}) {
  const pill = syncPill(sync.status, sync.waiting)
  const { isDark, toggle } = useTheme()
  return (
    <header className="flex h-16 flex-none items-center gap-4 border-b border-line bg-surface px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <BusinessTile name={business} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight">{business}</div>
          <div className="text-xs text-muted">Till · {device}</div>
        </div>
      </div>
      <div role="group" aria-label="Screen" className="seg seg-lg ml-2 w-[300px]">
        <button type="button" aria-pressed={screen === 'order'} onClick={() => onScreen('order')}>Order</button>
        <button type="button" aria-pressed={screen === 'queue'} onClick={() => onScreen('queue')}>
          Open orders
          {openCount > 0 && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold text-accent-ink">{openCount}</span>}
        </button>
      </div>
      <div className="flex-1" />
      <button type="button" onClick={onSettings} className="rounded-full p-1" aria-label="Sending orders">
        <Pill tone={pill.tone} pulse={pill.tone === 'success' || pill.tone === 'info'}>{pill.text}</Pill>
      </button>
      <div className="text-right leading-tight">
        <div className="num text-[15px] font-semibold">{clockTime(now)}</div>
        <div className="text-xs text-muted">{staff}</div>
      </div>
      <button type="button" onClick={toggle} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="grid h-11 w-11 place-items-center rounded-[10px] border border-line bg-surface text-ink-2 hover:bg-surface-2">
        <Icon size={17} stroke={2}>{isDark ? GLYPH.sun : GLYPH.moon}</Icon>
      </button>
      <button type="button" onClick={onSettings} aria-label="Till settings"
        className="grid h-11 w-11 place-items-center rounded-[10px] border border-line bg-surface text-ink-2 hover:bg-surface-2">
        <Icon size={18} stroke={2}>{GLYPH.settings}</Icon>
      </button>
    </header>
  )
}
