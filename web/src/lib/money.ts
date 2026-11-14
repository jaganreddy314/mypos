/** Cents as "$12.50"; negative amounts as "−$1.00". */
export const money = (c: number) => (c < 0 ? '−' : '') + '$' + (Math.abs(c) / 100).toFixed(2)
