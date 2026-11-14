import { describe, expect, it } from 'vitest'
import type { Group, Item } from './menu'
import {
  SIZE_GROUP, addLine, cashDue, isPaid, lineDetail, makeLine, missing, nextStep, owing, removeOne,
  ruleNote, statusLabel, surchargeOf, tapOption, totals, unitPrice,
} from './order'

const cook: Group = {
  id: 'cook', name: 'Cook option', min: 1, max: 1, repeat: false,
  options: [{ id: 'c', name: 'Crumbed', price: 0 }, { id: 'b', name: 'Battered', price: 0 }, { id: 'g', name: 'Grilled', price: 0 }],
}
const salad: Group = {
  id: 'salad', name: 'Salad', min: 0, max: 2, repeat: false,
  options: [{ id: 'p', name: 'Potato', price: 0 }, { id: 'sf', name: 'Seafood', price: 150 }, { id: 'cs', name: 'Coleslaw', price: 0 }],
}
const pack12: Group = { ...cook, id: 'cook12', min: 12, max: 12, repeat: true }

const item = (over: Partial<Item>): Item => ({
  id: 'i', name: 'Cod', description: '', plu: null, price: 1200, gstFree: false, imageUrl: null,
  sizes: [], groups: [], category: 'Fish Fillets', ...over,
})

describe('tapping options', () => {
  it('swaps a one-choice answer and never empties a required one', () => {
    expect(tapOption(cook, [], 'c')).toEqual(['c'])
    expect(tapOption(cook, ['c'], 'b')).toEqual(['b'])
    expect(tapOption(cook, ['b'], 'b')).toEqual(['b'])
  })

  it('drops the oldest pick when a several-choice group is full', () => {
    expect(tapOption(salad, ['p', 'sf'], 'cs')).toEqual(['sf', 'cs'])
    expect(tapOption(salad, ['p', 'sf'], 'p')).toEqual(['sf'])
  })

  it('fills a pack with the first pick, then swaps one at a time', () => {
    let sel = tapOption(pack12, [], 'c')
    expect(sel).toHaveLength(12)
    for (let k = 0; k < 6; k++) sel = tapOption(pack12, sel, 'b')
    expect(sel.filter((x) => x === 'c')).toHaveLength(6)
    expect(sel.filter((x) => x === 'b')).toHaveLength(6)
    for (let k = 0; k < 4; k++) sel = tapOption(pack12, sel, 'g')
    expect(sel.filter((x) => x === 'c')).toHaveLength(2)
    expect(sel).toHaveLength(12)
    expect(tapOption(pack12, Array(12).fill('b'), 'b')).toHaveLength(12)
    expect(removeOne(sel, 'g')).toHaveLength(11)
  })

  it('says what each group needs', () => {
    expect(ruleNote(cook)).toBe('Required · choose 1')
    expect(ruleNote(salad)).toBe('Choose up to 2')
    expect(ruleNote({ min: 0, max: 1, repeat: false })).toBe('Optional · choose 1')
    expect(ruleNote(pack12)).toBe('Required · choose 12 · first pick fills all')
  })

  it('names the first question still unanswered', () => {
    const it12 = item({ groups: [pack12] })
    expect(missing(it12, {})).toBe('Choose cook option')
    expect(missing(it12, { cook12: ['c', 'c'] })).toBe('Choose 10 more · cook option')
    expect(missing(it12, { cook12: Array(12).fill('c') })).toBeNull()
  })
})

describe('prices', () => {
  const coffee = item({
    name: 'Coffee', price: null,
    sizes: [{ id: 's', name: 'Small', price: 500 }, { id: 'l', name: 'Large', price: 700 }],
    groups: [salad],
  })

  it('takes the size price instead of the item price, and adds option prices', () => {
    expect(unitPrice(coffee, { [SIZE_GROUP]: ['l'] })).toBe(700)
    expect(unitPrice(coffee, { [SIZE_GROUP]: ['l'], salad: ['sf', 'p'] })).toBe(850)
    expect(missing(coffee, {})).toBe('Choose size')
  })

  it('makes a line that reads like the docket', () => {
    const l = makeLine(item({ groups: [pack12] }), { cook12: [...Array(6).fill('c'), ...Array(6).fill('b')] }, 2, ' no salt ', 'k')
    expect(lineDetail(l)).toBe('6 × Crumbed · 6 × Battered · Note: no salt')
    expect(l.unit).toBe(1200)
    const sized = makeLine(coffee, { [SIZE_GROUP]: ['s'] }, 1, '', 'k2')
    expect(lineDetail(sized)).toBe('Small')
    expect(sized.sizeId).toBe('s')
  })

  it('adds the same thing twice as one line', () => {
    const a = makeLine(item({ groups: [cook] }), { cook: ['b'] }, 1, '', 'a')
    const b = makeLine(item({ groups: [cook] }), { cook: ['b'] }, 2, '', 'b')
    const c = makeLine(item({ groups: [cook] }), { cook: ['g'] }, 1, '', 'c')
    const cart = addLine(addLine(addLine([], a), b), c)
    expect(cart.map((l) => l.qty)).toEqual([3, 1])
  })

  it('counts GST on taxable lines only', () => {
    const cooked = makeLine(item({ price: 3100 }), {}, 1, '', 'a')
    const fresh = makeLine(item({ price: 3300, gstFree: true }), {}, 1, '', 'b')
    expect(totals([cooked, fresh])).toEqual({ subtotal: 6400, gst: 282, count: 2 })
  })

  it('rounds cash to 5 cents and works out the card surcharge', () => {
    expect(cashDue(1232)).toBe(1230)
    expect(cashDue(1233)).toBe(1235)
    expect(surchargeOf(6400, 1.2)).toBe(77)
    expect(surchargeOf(6400, 0)).toBe(0)
  })
})

describe('the queue', () => {
  const lines = [makeLine(item({}), {}, 2, '', 'a')]
  const pay = { id: 'p', method: 'card' as const, amount: 2400, surcharge: 0, tendered: null, takenAt: '' }

  it('knows an order sent to the kitchen is still owed', () => {
    expect(owing({ lines, payments: [] })).toBe(2400)
    expect(statusLabel({ status: 'preparing', lines, payments: [] })).toBe('Awaiting payment')
    expect(statusLabel({ status: 'preparing', lines, payments: [pay] })).toBe('Preparing')
    expect(isPaid({ lines, payments: [pay] })).toBe(true)
  })

  it('moves preparing → ready → collected → reopened', () => {
    expect(nextStep({ status: 'preparing' })).toEqual({ label: 'Mark ready', to: 'ready' })
    expect(nextStep({ status: 'ready' })).toEqual({ label: 'Hand over', to: 'collected' })
    expect(nextStep({ status: 'collected' })).toEqual({ label: 'Reopen', to: 'preparing' })
  })
})
