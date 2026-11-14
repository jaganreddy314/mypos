import { useState } from 'react'
import type { Group, Item } from '../lib/menu'
import { money } from '../lib/money'
import { SIZE_GROUP, makeLine, missing, questions, removeOne, ruleNote, tapOption, unitPrice, type Line, type Selection } from '../lib/order'

/** Slides in from the right to ask an item's questions: its size, how it's cooked, which drink. */
export function OptionsPanel({ item, onClose, onAdd }: { item: Item; onClose: () => void; onAdd: (l: Line) => void }) {
  const groups = questions(item)
  const [sel, setSel] = useState<Selection>({})
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const short = missing(item, sel)

  const set = (g: Group, next: string[]) => setSel((s) => ({ ...s, [g.id]: next }))

  return (
    <>
      <div className="absolute inset-x-0 bottom-0 top-[68px] z-20 animate-fade bg-[color-mix(in_srgb,#201f1d_34%,transparent)]" onClick={onClose} />
      <section className="absolute bottom-0 right-0 top-[68px] z-30 flex w-[672px] max-w-full animate-slide flex-col border-l border-divider bg-bg shadow-lg">
        <div className="flex items-start gap-4 border-b border-divider px-6 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <div className="kicker">{item.category}</div>
            <h3 className="mt-1 text-[27px] font-medium">{item.name}</h3>
            {item.description && <div className="mt-1 text-[12.5px] text-neutral-700 [text-wrap:pretty]">{item.description}</div>}
          </div>
          <button onClick={onClose} className="btn h-[46px] w-[46px] font-body text-[20px] font-normal" aria-label="Close">×</button>
        </div>

        <div className="pos-scroll min-h-0 flex-1 px-6 pb-6 pt-5">
          {groups.map((g) => {
            const picked = sel[g.id] ?? []
            return (
              <div key={g.id} className="mb-6">
                <div className="flex items-baseline gap-2.5 border-b border-divider pb-2">
                  <span className="font-heading text-[18px] font-semibold">{g.name}</span>
                  <span className="meta">{ruleNote(g)}</span>
                  {g.repeat && picked.length > 0 && (
                    <span className="meta ml-auto">{picked.length} of {g.max}</span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {g.options.map((o) => {
                    const n = picked.filter((x) => x === o.id).length
                    const on = n > 0
                    const price = g.id === SIZE_GROUP ? money(o.price) : o.price ? '+' + money(o.price) : 'No charge'
                    return (
                      <div key={o.id} className="relative">
                        <button onClick={() => set(g, tapOption(g, picked, o.id))}
                          className={`flex min-h-[62px] w-full flex-col items-start justify-center gap-0.5 rounded-md border px-3 py-2 text-left font-heading text-base font-semibold ${on ? 'border-accent bg-accent-100 text-accent-800' : 'border-divider bg-neutral-100 hover:bg-neutral-200'}`}>
                          <span className={g.repeat && on ? 'pr-12' : ''}>{g.repeat && on ? `${n} × ${o.name}` : o.name}</span>
                          <span className={`font-body text-[11.5px] font-normal tracking-[0.06em] ${on ? '' : 'text-neutral-700'}`}>{price}</span>
                        </button>
                        {g.repeat && on && (
                          <button onClick={() => set(g, removeOne(picked, o.id))} aria-label={`One fewer ${o.name}`}
                            className="btn-step absolute right-2 top-1/2 h-11 w-11 -translate-y-1/2 text-[20px]">
                            −
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div>
            <div className="flex items-baseline gap-2.5 border-b border-divider pb-2">
              <span className="font-heading text-[18px] font-semibold">Kitchen note</span>
              <span className="meta">Optional</span>
            </div>
            <input className="field mt-3 min-h-12" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. well done, no tartare, allergy — nut free" />
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-divider bg-neutral-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <button className="btn-step h-[50px] w-[50px] text-[22px]" onClick={() => setQty((x) => Math.max(1, x - 1))} aria-label="One fewer">−</button>
            <span className="min-w-[34px] text-center font-heading text-[24px]">{qty}</span>
            <button className="btn-step h-[50px] w-[50px] text-[22px]" onClick={() => setQty((x) => x + 1)} aria-label="One more">+</button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-700">{short ?? 'Line total'}</div>
            <div className="font-heading text-[26px] leading-[1.15] text-accent-700">{money(unitPrice(item, sel) * qty)}</div>
          </div>
          <button className="btn btn-accent min-h-[58px] px-[30px] text-[19px]" disabled={!!short}
            onClick={() => onAdd(makeLine(item, sel, qty, note, crypto.randomUUID()))}>
            Add to order
          </button>
        </div>
      </section>
    </>
  )
}
