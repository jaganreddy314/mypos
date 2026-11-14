// The till: one screen that takes an order, asks an item's questions, takes payment and keeps
// the day's open orders. Every order is saved on the iPad first and sent on by sync.ts.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, loadMenu } from '../lib/db'
import { tradingDay } from '../lib/dates'
import type { Item } from '../lib/menu'
import { addLine, makeLine, questions, type Line, type Order, type OrderType, type Payment as Paid } from '../lib/order'
import { nextOrderNumber, type Settings } from '../lib/settings'
import { refreshMenu, saveOrder, useSync } from '../lib/sync'
import { Docket, type DocketKind } from './Docket'
import { Header } from './Header'
import { OptionsPanel } from './OptionsPanel'
import { OrderEntry } from './OrderEntry'
import { Payment } from './Payment'
import { Queue } from './Queue'
import { SettingsSheet } from './SettingsSheet'
import { useNow, useToast } from './hooks'
import { Notice, Toast } from './ui'

/** The order being built, kept through a reload so a half-taken order is never lost. */
export interface Draft { lines: Line[]; type: OrderType; reference: string }
const DRAFT = 'till.draft'
const emptyDraft: Draft = { lines: [], type: 'takeaway', reference: '' }

function useDraft() {
  const [draft, setDraft] = useState<Draft>(() => {
    try { return { ...emptyDraft, ...JSON.parse(localStorage.getItem(DRAFT) || '{}') } } catch { return emptyDraft }
  })
  useEffect(() => { localStorage.setItem(DRAFT, JSON.stringify(draft)) }, [draft])
  return [draft, setDraft] as const
}

export function Till({ settings }: { settings: Settings }) {
  const menu = useLiveQuery(async () => (await loadMenu()) ?? null, [])
  const sync = useSync()
  const now = useNow()
  const today = tradingDay(now)
  const orders = useLiveQuery(
    async () => (await db.orders.where('saleDate').equals(today).sortBy('createdAt')).reverse(),
    [today],
  ) ?? []

  const [screen, setScreen] = useState<'order' | 'queue'>('order')
  const [draft, setDraft] = useDraft()
  const [panel, setPanel] = useState<Item | null>(null)
  const [paying, setPaying] = useState<{ orderId: string | null } | null>(null)  // null: the cart
  const [docket, setDocket] = useState<{ order: Order; kind: DocketKind } | null>(null)
  const [printing, setPrinting] = useState<{ order: Order; kind: DocketKind } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [menuError, setMenuError] = useState('')
  const toast = useToast()

  // A fresh menu each time the till opens; the copy on the iPad carries on if this fails.
  useEffect(() => {
    if (!navigator.onLine) return
    refreshMenu(settings.businessId).then(() => setMenuError(''), (e: Error) => setMenuError(e.message))
  }, [settings.businessId])

  // Printing shows the docket on its own, prints, then puts the screen back.
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done, { once: true })
    window.print()
    return () => window.removeEventListener('afterprint', done)
  }, [printing])

  if (menu === undefined) return null
  if (menu === null) {
    return (
      <Notice title="The menu isn’t on this iPad yet">
        <p>The till needs to load the menu once while it’s online. {menuError}</p>
        <button type="button" className="btn btn-primary btn-lg mt-5 w-full"
          onClick={() => refreshMenu(settings.businessId).then(() => setMenuError(''), (e: Error) => setMenuError(e.message))}>
          Try again
        </button>
      </Notice>
    )
  }

  function add(it: Item) {
    if (questions(it).length) { setPanel(it); return }
    setDraft((d) => ({ ...d, lines: addLine(d.lines, makeLine(it, {}, 1, '', crypto.randomUUID())) }))
    toast.say(it.name + ' added')
  }

  /** Turns the cart into an order on the iPad and starts a new one. */
  async function placeOrder(payments: Paid[]): Promise<Order> {
    const at = new Date().toISOString()
    const order: Order = {
      id: crypto.randomUUID(),
      businessId: settings.businessId,
      number: nextOrderNumber(),
      device: settings.device,
      type: draft.type,
      reference: draft.type === 'takeaway' ? '' : draft.reference.trim(),
      status: 'preparing',
      saleDate: tradingDay(),
      createdAt: at,
      updatedAt: at,
      lines: draft.lines,
      payments,
      synced: 0,
    }
    await saveOrder(order)
    // Back to Takeaway: the next customer is most likely at the counter.
    setDraft(emptyDraft)
    return order
  }

  async function sendToKitchen() {
    if (!draft.lines.length) return
    const order = await placeOrder([])
    setDocket({ order, kind: 'kitchen' })
    toast.say(`Docket sent to kitchen · #${order.number} awaiting payment`)
  }

  async function paid(payment: Omit<Paid, 'takenAt'>) {
    const p: Paid = { ...payment, takenAt: new Date().toISOString() }
    const target = paying?.orderId ? orders.find((o) => o.id === paying.orderId) : null
    let order: Order
    if (target) {
      order = { ...target, payments: [...target.payments, p] }
      await saveOrder(order)
    } else {
      order = await placeOrder([p])
    }
    setPaying(null)
    setDocket({ order, kind: 'receipt' })
  }

  const payingOrder = paying?.orderId ? orders.find((o) => o.id === paying.orderId) ?? null : null

  return (
    <>
      <div className="relative flex h-full flex-col overflow-hidden bg-page">
        <Header
          business={settings.businessName}
          device={settings.device}
          screen={screen}
          onScreen={setScreen}
          openCount={orders.filter((o) => o.status !== 'collected').length}
          now={now}
          staff={settings.staffName}
          sync={sync}
          onSettings={() => setShowSettings(true)}
        />

        {screen === 'order' ? (
          <OrderEntry
            menu={menu}
            draft={draft}
            setDraft={setDraft}
            onAdd={add}
            onClear={() => { setDraft((d) => ({ ...d, lines: [] })); toast.say('Order cleared') }}
            onSend={sendToKitchen}
            onPay={() => draft.lines.length && setPaying({ orderId: null })}
          />
        ) : (
          <Queue
            orders={orders}
            onDocket={(o) => setDocket({ order: o, kind: 'receipt' })}
            onAdvance={(o, status) => saveOrder({ ...o, status })}
            onPay={(o) => setPaying({ orderId: o.id })}
            onNew={() => setScreen('order')}
          />
        )}

        {panel && (
          <OptionsPanel
            item={panel}
            onClose={() => setPanel(null)}
            onAdd={(line) => {
              setDraft((d) => ({ ...d, lines: addLine(d.lines, line) }))
              setPanel(null)
              toast.say(`${line.qty} × ${line.name} added`)
            }}
          />
        )}

        {paying && (
          <Payment
            number={payingOrder?.number}
            type={payingOrder?.type ?? draft.type}
            reference={payingOrder?.reference ?? draft.reference}
            lines={payingOrder?.lines ?? draft.lines}
            payments={payingOrder?.payments ?? []}
            surchargePct={settings.surchargePct}
            onBack={() => setPaying(null)}
            onPaid={paid}
          />
        )}

        {docket && (
          <Docket
            order={docket.order}
            kind={docket.kind}
            onClose={() => setDocket(null)}
            onPrint={() => {
              setPrinting(docket)
              setDocket(null)
              toast.say('Docket sent to printer')
            }}
          />
        )}

        {showSettings && <SettingsSheet settings={settings} sync={sync} menu={menu} onClose={() => setShowSettings(false)} />}

        <Toast text={toast.text} />
      </div>
      {printing && createPortal(<div className="print-only"><Docket order={printing.order} kind={printing.kind} printable /></div>, document.body)}
    </>
  )
}
