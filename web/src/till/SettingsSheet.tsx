// The till's own settings, opened from the Fish Lips mark in the header: what this iPad is
// called, the card surcharge, the menu, and orders still waiting to be sent.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { clockTime } from '../lib/dates'
import type { Menu } from '../lib/menu'
import { saveSettings, updateSettings, type Settings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { pushOrders, refreshMenu, type SyncStatus } from '../lib/sync'
import { useSession } from './hooks'
import { GLYPH } from './glyphs'
import { Icon } from './icons'
import { SignInForm } from './Setup'
import { Dialog } from './ui'

export function SettingsSheet({ settings, sync, menu, onClose }: {
  settings: Settings
  sync: { status: SyncStatus; waiting: number }
  menu: Menu
  onClose: () => void
}) {
  const session = useSession()
  const [device, setDevice] = useState(settings.device)
  const [surcharge, setSurcharge] = useState(String(settings.surchargePct))
  const [menuNote, setMenuNote] = useState('')
  const unsent = useLiveQuery(() => db.orders.where('synced').equals(0).toArray(), [], [])
  const items = menu.categories.reduce((a, c) => a + c.items.length, 0)

  function save() {
    const pct = Number(surcharge)
    updateSettings({
      device: device.trim() || 'Counter',
      surchargePct: Number.isFinite(pct) && pct >= 0 && pct <= 3 ? pct : settings.surchargePct,
    })
    onClose()
  }

  async function reloadMenu() {
    setMenuNote('Loading…')
    try {
      const m = await refreshMenu(settings.businessId)
      setMenuNote(`Updated: ${m.categories.reduce((a, c) => a + c.items.length, 0)} items`)
    } catch (e) {
      setMenuNote(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Dialog onClose={onClose} width={520}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.04em] text-faint">{settings.businessName}</div>
          <h1 className="mt-1 text-xl font-semibold">Till settings</h1>
        </div>
        <button type="button" className="btn btn-icon rounded-[10px]" onClick={onClose} aria-label="Close"><Icon size={20} stroke={2}>{GLYPH.x}</Icon></button>
      </div>

      <Section title="This iPad">
        <label className="label" htmlFor="device">Name on dockets and orders</label>
        <input id="device" className="field" value={device} onChange={(e) => setDevice(e.target.value)} />
        <label className="label mt-3" htmlFor="surcharge">Card surcharge %</label>
        <input id="surcharge" className="field" inputMode="decimal" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
        <p className="mt-1.5 text-xs text-muted">Leave at 0 if the Tyro terminal adds the surcharge itself, so it isn’t charged twice.</p>
      </Section>

      <Section title="Menu">
        <p className="text-sm text-ink-2">
          {items} items, loaded {clockTime(menu.takenAt)} on {new Date(menu.takenAt).toLocaleDateString('en-AU')}. Prices are changed in the store app, under Food → Menu.
        </p>
        <div className="mt-2.5 flex items-center gap-3">
          <button type="button" className="btn min-h-11" onClick={reloadMenu}>Load the latest menu</button>
          <span className="text-sm text-muted">{menuNote}</span>
        </div>
      </Section>

      <Section title="Sending orders">
        <p className="text-sm text-ink-2">
          {sync.waiting ? `${sync.waiting} order${sync.waiting === 1 ? '' : 's'} saved on this iPad, not sent yet.` : 'Every order has been sent.'}
          {sync.status === 'offline' && ' There’s no connection; they’ll go when it’s back.'}
        </p>
        {unsent.filter((o) => o.error).map((o) => (
          <div key={o.id} role="alert" className="mt-2 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">#{o.number}: {o.error}</div>
        ))}
        {sync.waiting > 0 && session && (
          <button type="button" className="btn mt-2.5 min-h-11" onClick={() => void pushOrders()}>Send now</button>
        )}
        {session === null && (
          <>
            <p className="mt-2 text-sm text-ink-2">Nobody is signed in, so orders can’t be sent. Sign in to send them.</p>
            <SignInForm />
          </>
        )}
        {session && <p className="mt-2 text-xs text-muted">Signed in as {session.user.email}</p>}
      </Section>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-danger btn-lg" disabled={sync.waiting > 0}
          title={sync.waiting ? 'Send every order first' : undefined}
          onClick={async () => { await supabase.auth.signOut(); saveSettings(null) }}>
          Sign out of this till
        </button>
        <button type="button" className="btn btn-primary btn-lg" onClick={save}>Done</button>
      </div>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="border-b border-line pb-2 text-[15px] font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  )
}
