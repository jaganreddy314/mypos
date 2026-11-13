<img src="assets/icon.svg" width="64" height="64" alt="">

# MyPOS

The counter till for Fish Lips Samford: an iPad app that takes orders, sends dockets to the
kitchen and takes payment. It is one more app on the store management database
([jk-bhairavi](https://github.com/jaganreddy314/jk-bhairavi)), not a system of its own: the
menu is kept there, and the day's takings flow back into its sales, item sales and food cost.

## How it fits together

| Lives in the store app's database | What the till does with it |
|---|---|
| `businesses`, `business_users`, security groups | Fish Lips Samford is one business; the till signs in as one of its people |
| The menu (`menu_*`, `modifier_*`, migration `022_menu.sql`) | Reads it whole with `menu_snapshot()` and keeps it on the iPad |
| `sales_days` | Filled in when the day is closed: card and cash takings, no typing |
| `item_sales` | Quantities sold, for items linked to a catalogue product |
| `staff` | Who is serving, recorded on each order |

**The schema has one owner: the store repo.** Every table change is a migration in its
`supabase/migrations/`, released through its feature → `qa` → `main` flow. This repo holds the
till app and its tooling, and never changes the database on its own.

## Decisions so far

- **Card payments: Tyro.** The till starts with "paid on the Tyro terminal" and the amount
  keyed in. The integrated version (Tyro iClient, card amount sent to the terminal) needs
  Tyro to register the POS for integration, so it comes once the till is in use.
- **No switch-over date.** The till runs beside the current POS until it's trusted.
- **Prices come from the website** (fishlipssamford.com.au) until the till takes over as the
  source. Cook options are free there (the design's +$9 for battered is out of date).

## Menu

`scripts/menu/fishlips_menu.py` reads the website, including each pack's choices (Cod or
Snapper, which drink), and writes `supabase/seed/fishlips-menu.json`: 105 items in 15
categories, with sizes and 12 option groups. Packs ask a group several times: a 12-piece
asks "Cook option" twelve times, as one choice with repeats.

```bash
python3 scripts/menu/fishlips_menu.py > supabase/seed/fishlips-menu.json   # refresh from the website
```

Load it in the store app (**Food → Menu → Import menu**, needs the Catalogue area), or with psql:

```bash
scripts/menu/load.sh "$(cat ../jk-bhairavi-app/.qa-db-url)" "Fish Lips Samford"
```

Loading again updates prices and adds new items; nothing is removed or duplicated.

## Plan

1. **Menu in the store app** ✔ migration `022_menu.sql`, Food → Menu page, website import.
2. **Till MVP** (this repo): the design in `design_handoff_fishlips_pos` built in React + Vite +
   TypeScript + Tailwind, as the store app is. Order entry, options, cart, cash and "paid on
   Tyro", open-orders queue, kitchen dockets. Works offline: menu cached, each order written to
   the iPad first (IndexedDB) and sent with an idempotent `submit_pos_order` call when online.
   Migration `023_pos_orders.sql` adds orders, lines, payments and shifts, plus a `pos` area.
3. **Back office**: closing the day writes `sales_days` and `item_sales`, so the dashboard and
   food cost cover Fish Lips with no change.
4. **Payments and printing**: Tyro iClient, network docket printer (Epson ePOS), refunds and
   voids behind a manager PIN, discounts, split payment, end-of-shift cash-up.
5. **Later**: recipes (menu item → stock used) for theoretical vs actual food cost, online and
   Uber orders arriving on the till, email receipts.
