import { useState } from 'react'
import type { Group, Item } from '../lib/menu'
import { money } from '../lib/money'
import { SIZE_GROUP, makeLine, missing, questions, removeOne, ruleNote, tapOption, unitPrice, type Line, type Selection } from '../lib/order'
import { GLYPH } from './glyphs'
import { Icon } from './icons'

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
      <div className="absolute inset-x-0 bottom-0 top-16 z-20 animate-fade bg-[rgba(16,24,40,0.4)]" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-label={item.name}
        className="absolute bottom-0 right-0 top-16 z-30 flex w-[680px] max-w-full animate-slide flex-col border-l border-line bg-page shadow-[var(--shadow-float)]">
        <div className="flex items-start gap-4 border-b border-line bg-surface px-6 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-[0.04em] text-faint">{item.category}</div>
            <h2 className="mt-1 text-2xl font-semibold">{item.name}</h2>
            {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn btn-icon rounded-[10px]" aria-label="Close"><Icon size={20} stroke={2}>{GLYPH.x}</Icon></button>
        </div>

        <div className="scroll min-h-0 flex-1 px-6 pb-6 pt-5">
          {groups.map((g) => {
            const picked = sel[g.id] ?? []
            const done = picked.length >= g.min && picked.length > 0
            return (
              <div key={g.id} className="mb-6">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-semibold">{g.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${g.min > 0 && !done ? 'bg-[#FFFAEB] text-[#B54708] dark:bg-[#4E1D09] dark:text-[#FEC84B]' : 'bg-surface-2 text-ink-2'}`}>
                    {ruleNote(g)}
                  </span>
                  {g.repeat && picked.length > 0 && <span className="num ml-auto text-sm font-medium text-muted">{picked.length} of {g.max}</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {g.options.map((o) => {
                    const n = picked.filter((x) => x === o.id).length
                    const on = n > 0
                    const price = g.id === SIZE_GROUP ? money(o.price) : o.price ? '+' + money(o.price) : 'No charge'
                    return (
                      <div key={o.id} className="relative">
                        <button type="button" onClick={() => set(g, tapOption(g, picked, o.id))} aria-pressed={on}
                          className={`flex min-h-16 w-full flex-col items-start justify-center gap-0.5 rounded-xl border px-3.5 py-2 text-left shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${on ? 'border-accent bg-accent-tint text-accent ring-1 ring-accent' : 'border-line bg-surface text-ink hover:bg-hover'}`}>
                          <span className={`font-semibold ${g.repeat && on ? 'pr-12' : ''}`}>{g.repeat && on ? `${n} × ${o.name}` : o.name}</span>
                          <span className={`num text-xs ${on ? 'text-accent' : 'text-muted'}`}>{price}</span>
                        </button>
                        {g.repeat && on && (
                          <button type="button" onClick={() => set(g, removeOne(picked, o.id))} aria-label={`One fewer ${o.name}`}
                            className="btn btn-icon absolute right-2 top-1/2 -translate-y-1/2 rounded-lg">
                            <Icon size={16} stroke={2}>{GLYPH.minus}</Icon>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <label className="label" htmlFor="kitchen-note">Kitchen note <span className="font-normal text-muted">(optional)</span></label>
          <input id="kitchen-note" className="field min-h-12" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. well done, no tartare, allergy — nut free" />
        </div>

        <div className="flex items-center gap-4 border-t border-line bg-surface px-6 py-4">
          <div className="flex items-center gap-1.5">
            <button type="button" className="btn btn-icon h-12 w-12 rounded-[10px]" onClick={() => setQty((x) => Math.max(1, x - 1))} aria-label="One fewer"><Icon size={18} stroke={2}>{GLYPH.minus}</Icon></button>
            <span className="num min-w-9 text-center text-xl font-semibold">{qty}</span>
            <button type="button" className="btn btn-icon h-12 w-12 rounded-[10px]" onClick={() => setQty((x) => x + 1)} aria-label="One more"><Icon size={18} stroke={2}>{GLYPH.plus}</Icon></button>
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-medium ${short ? 'text-[#B54708] dark:text-[#FEC84B]' : 'text-muted'}`}>{short ?? 'Line total'}</div>
            <div className="num text-2xl font-semibold tracking-[-0.02em]">{money(unitPrice(item, sel) * qty)}</div>
          </div>
          <button type="button" className="btn btn-primary btn-xl px-8" disabled={!!short}
            onClick={() => onAdd(makeLine(item, sel, qty, note, crypto.randomUUID()))}>
            Add to order
          </button>
        </div>
      </section>
    </>
  )
}
