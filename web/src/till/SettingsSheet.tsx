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
import { SignInForm } from './Setup'

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
    <div className="absolute inset-0 z-50 flex animate-fade items-start justify-center bg-[color-mix(in_srgb,#201f1d_40%,transparent)] py-12" onClick={onClose}>
      <div className="pos-scroll max-h-full w-[520px] animate-slide rounded-lg border border-divider bg-bg p-7 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="kicker">{settings.businessName}</div>
        <h2 className="mt-1 text-[27px] font-medium">Till settings</h2>

        <Section title="This iPad">
          <label className="block text-[13px] text-neutral-700">Name on dockets and orders
            <input className="field mt-1" value={device} onChange={(e) => setDevice(e.target.value)} />
          </label>
          <label className="mt-3 block text-[13px] text-neutral-700">Card surcharge %
            <input className="field mt-1" inputMode="decimal" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
            <span className="mt-1 block text-[12px]">Leave at 0 if the Tyro terminal adds the surcharge itself, so it isn’t charged twice.</span>
          </label>
        </Section>

        <Section title="Menu">
          <p className="text-[13px] text-neutral-700">
            {items} items, loaded {clockTime(menu.takenAt)} on {new Date(menu.takenAt).toLocaleDateString('en-AU')}. Prices are changed in the store app, under Food → Menu.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button className="btn min-h-11 px-4 text-[15px]" onClick={reloadMenu}>Load the latest menu</button>
            <span className="text-[13px] text-neutral-700">{menuNote}</span>
          </div>
        </Section>

        <Section title="Sending orders">
          <p className="text-[13px] text-neutral-700">
            {sync.waiting ? `${sync.waiting} order${sync.waiting === 1 ? '' : 's'} saved on this iPad, not sent yet.` : 'Every order has been sent.'}
            {sync.status === 'offline' && ' There’s no connection; they’ll go when it’s back.'}
          </p>
          {unsent.filter((o) => o.error).map((o) => (
            <p key={o.id} className="mt-1 text-[13px] text-accent-800">#{o.number}: {o.error}</p>
          ))}
          {sync.waiting > 0 && session && (
            <button className="btn mt-2 min-h-11 px-4 text-[15px]" onClick={() => void pushOrders()}>Send now</button>
          )}
          {session === null && (
            <>
              <p className="mt-2 text-[13px] text-neutral-700">Nobody is signed in, so orders can’t be sent. Sign in to send them.</p>
              <SignInForm />
            </>
          )}
          {session && <p className="mt-2 text-[12px] text-neutral-700">Signed in as {session.user.email}</p>}
        </Section>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button className="btn btn-quiet min-h-12 text-[15px]" disabled={sync.waiting > 0}
            title={sync.waiting ? 'Send every order first' : undefined}
            onClick={async () => { await supabase.auth.signOut(); saveSettings(null) }}>
            Sign out of this till
          </button>
          <button className="btn btn-accent min-h-12 text-[15px]" onClick={save}>Done</button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="border-b border-divider pb-1.5 font-heading text-[18px] font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
