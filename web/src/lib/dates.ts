// The shop trades in Brisbane time, whatever the iPad's own clock zone says.
const TZ = 'Australia/Brisbane'

/** The trading day as YYYY-MM-DD. */
export const tradingDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)

/** "6:40 pm" */
export const clockTime = (d: Date | string = new Date()) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(d)).replace(/\s?([ap])\.?m\.?/i, (_, x: string) => ` ${x.toLowerCase()}m`)
