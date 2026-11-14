import { clockTime } from '../lib/dates'
import type { SyncStatus } from '../lib/sync'
import { Brand } from './ui'

const navOn = 'border-accent bg-accent-100 text-accent-700'
const navOff = 'border-transparent text-neutral-700 hover:bg-neutral-200'

/** What the status pill says: the connection, and whether orders are waiting on the iPad. */
function syncLabel(status: SyncStatus, waiting: number): { text: string; live: boolean } {
  if (status === 'offline') return { text: waiting ? `Offline · ${waiting} saved here` : 'Offline', live: false }
  if (status === 'signin') return { text: `Sign in to send ${waiting}`, live: false }
  if (status === 'error' && waiting) return { text: `${waiting} not sent`, live: false }
  if (waiting) return { text: `Sending ${waiting}`, live: true }
  return { text: 'Terminal online', live: true }
}

export function Header({ screen, onScreen, openCount, now, staff, sync, onSettings }: {
  screen: 'order' | 'queue'
  onScreen: (s: 'order' | 'queue') => void
  openCount: number
  now: Date
  staff: string
  sync: { status: SyncStatus; waiting: number }
  onSettings: () => void
}) {
  const pill = syncLabel(sync.status, sync.waiting)
  return (
    <header className="flex h-[68px] flex-none items-center gap-5 border-b border-divider bg-neutral-100 px-[22px]">
      <button onClick={onSettings} className="-m-2 min-h-[44px] rounded-md p-2 text-left hover:bg-neutral-200" aria-label="Till settings">
        <Brand />
      </button>
      <div className="h-[34px] w-px bg-divider" />
      <nav className="flex gap-1">
        <button onClick={() => onScreen('order')}
          className={`min-h-[44px] rounded-md border px-5 font-heading text-base font-semibold ${screen === 'order' ? navOn : navOff}`}>
          Order
        </button>
        <button onClick={() => onScreen('queue')}
          className={`min-h-[44px] rounded-md border px-5 font-heading text-base font-semibold ${screen === 'queue' ? navOn : navOff}`}>
          Open orders · {openCount}
        </button>
      </nav>
      <div className="flex-1" />
      <button onClick={onSettings} className="flex min-h-[34px] items-center gap-2.5 rounded-full border border-divider px-3 py-1.5 hover:bg-neutral-200">
        <span className={`h-[7px] w-[7px] rounded-full ${pill.live ? 'animate-pulse-dot bg-accent' : 'bg-neutral-700'}`} />
        <span className="text-[12px] uppercase tracking-[0.06em] text-neutral-700">{pill.text}</span>
      </button>
      <div className="text-right leading-[1.25]">
        <div className="font-heading text-[17px]">{clockTime(now)}</div>
        <div className="text-[11px] text-neutral-700">Shift: {staff}</div>
      </div>
    </header>
  )
}
