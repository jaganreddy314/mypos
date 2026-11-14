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
| The menu (`menu_*`, `modifier_*`, migration `023_menu.sql`) | Reads it whole with `menu_snapshot()` and keeps it on the iPad |
| Till orders (`pos_orders`, `pos_order_lines`, `pos_payments`, migration `024_pos_orders.sql`) | Each order is saved on the iPad, then sent with `submit_pos_order()`, which is safe to repeat |
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

## The till app

`web/` is the iPad app: React, Vite, TypeScript and Tailwind, as the store app is, and styled
like it (the same colour tokens, Geist, light and dark), so the two read as one system. The
screens follow `design_handoff_fishlips_pos` for layout and flow.

```bash
cd web
cp .env.example .env    # the store app's Supabase address and anon key
npm install
npm run dev             # http://localhost:5173
npm test                # prices, option rules, GST and the queue
npm run build           # dist/, installable on the iPad from Safari: Share → Add to Home Screen
```

- **Live:** <https://jaganreddy314.github.io/mypos/>, published from `main` by
  `.github/workflows/deploy.yml` against the store app's production database (repo variables
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). On the iPad: open it in Safari, Share → Add to Home Screen.
- **Setting up an iPad:** sign in with a store app login whose group has the **Till** area, and
  pick the business. The menu is loaded then and kept on the iPad; after that the till opens
  straight into taking orders, online or not.
- **No connection:** orders are saved on the iPad (IndexedDB) and sent when it's back. The
  header pill says how many are waiting. Nothing is lost if the app is closed mid-order.
- **Card:** key the amount into the Tyro terminal, then tap *Approved on Tyro*. **Cash** works
  out change to the nearest 5 cents.
- **Phone orders:** *Send to kitchen* makes the docket unpaid; it waits under *Open orders*
  with a *Pay* button, and can't be handed over until it's paid.
- **Settings** (tap the Fish Lips mark): this iPad's name, the card surcharge (0 unless the
  till should add one; Tyro terminals usually add their own), loading the latest menu, and
  orders not yet sent.
- **Dockets** print through the iPad's print dialog for now (AirPrint), sized for an 80mm roll.

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

1. **Menu in the store app** ✔ migration `023_menu.sql`, Food → Menu page, website import.
2. **Till MVP** ✔ `web/`: order entry, options (packs ask a question several times), cart,
   cash and "paid on Tyro", open-orders queue, kitchen dockets and receipts, working offline.
   Migration `024_pos_orders.sql` adds orders, lines and payments, plus a **Till** area.
3. **Back office**: closing the day writes `sales_days` and `item_sales`, so the dashboard and
   food cost cover Fish Lips with no change.
4. **Payments and printing**: Tyro iClient, network docket printer (Epson ePOS), refunds and
   voids behind a manager PIN, discounts, split payment, staff sign-in per shift, end-of-shift
   cash-up.
5. **Later**: recipes (menu item → stock used) for theoretical vs actual food cost, online and
   Uber orders arriving on the till, email receipts.
