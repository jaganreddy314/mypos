#!/usr/bin/env python3
"""Builds the Fish Lips Samford menu from fishlipssamford.com.au, as an import_menu document.

    python3 scripts/menu/fishlips_menu.py > supabase/seed/fishlips-menu.json

The website (an online-ordering platform) is the source of truth for prices until the till
takes over, so this is run again whenever the website's menu changes. import_menu matches on
names and till codes, so loading the result twice updates rather than duplicates.

Packs ("deals") list their choices in a separate popup per pack; those are fetched too.
Pass --html FILE and --deals DIR to build from saved copies instead of the live site.
"""
import argparse
import html as H
import http.cookiejar
import json
import os
import re
import sys
import urllib.parse
import urllib.request

SITE = 'https://fishlipssamford.com.au'

# The website's group labels, as staff should read them on the till.
GROUP_NAMES = {
    'Cook Option': 'Cook option',
    'Salt/ Lemon Option': 'Salt / lemon',
    'Choice of Salad': 'Salad',
    'Kids Burger Option': 'Kids burger',
    'Coffee Option': 'Coffee',
    'Shakes Option': 'Shake flavour',
    'Powerade Option': 'Powerade flavour',
    'Fuse Ice Tea Option': 'Fuse Ice Tea flavour',
    'Crows Nest Option': 'Crows Nest flavour',
}

# A pack's choices, keyed by the set of options it offers.
DEAL_GROUPS = {
    frozenset({'Cod', 'Snapper'}): 'Fish',
    frozenset({'390ml Coke', '390ml Coke No Sugar'}): '390ml drink',
    frozenset({'1.25l Coke', '1.25l Coke No Sugar'}): '1.25L drink',
    frozenset({'Crumbed', 'Battered', 'Grilled'}): 'Cook option',
}

# Headings on the website that aren't menu categories, or have nothing in them yet.
SKIP_CATEGORIES = {'Refer a friend', 'Fresh Seafood (Coming Soon)'}


def text(s):
    return H.unescape(H.unescape(re.sub(r'<[^>]+>', '', s))).strip()


def attr(tag, name):
    m = re.search(r"""\b%s\s*=\s*(['"])(.*?)\1""" % name, tag)
    return m and m.group(2)


def money(s):
    return round(float(s), 2)


class Site:
    def __init__(self):
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.opener.addheaders = [('User-Agent', 'Mozilla/5.0'), ('Referer', SITE + '/')]

    def get(self, path, data=None):
        body = urllib.parse.urlencode(data).encode() if data else None
        req = urllib.request.Request(SITE + path, data=body)
        if data:
            req.add_header('X-Requested-With', 'XMLHttpRequest')
        with self.opener.open(req, timeout=30) as r:
            return r.read().decode('utf-8', 'replace')


def parse_items(page):
    """Every item on the page: its category, price, sizes and option groups."""
    heads = list(re.finditer(r'<li\s+id="[^"]*"\s+style="[^"]*"\s+(?:display-special-always=\S+\s+)?class="(single|group)"', page))
    items = []
    for i, m in enumerate(heads):
        b = page[m.start(): heads[i + 1].start() if i + 1 < len(heads) else m.start() + 80000]
        b = b[:b.find('</li>') + 5] if '</li>' in b else b
        head = b[:b.find('>')]
        d = re.search(r"class=['\"]item-description['\"]>(.*?)</div>", b, re.S)
        img = re.search(r"data-src='([^']+)'", b)
        deal = re.search(r'<input name="Add Deal"[^>]*>', b)
        it = {
            'plu': attr(head, 'data-plu') or None,
            'name': text(attr(head, 'data-item-name') or ''),
            'category': text(attr(head, 'data-item-category') or ''),
            'price': attr(head, 'data-price'),
            'description': text(d.group(1)) if d else '',
            'image_url': img.group(1) if img else None,
            'deal': deal and {'id': attr(deal.group(0), 'deal-id'), 'menu': attr(deal.group(0), 'menu-id')},
        }
        sizes = []
        for v in re.finditer(r"(<input[^>]*menu-option-radio-list[^>]*>)\s*<label[^>]*>(.*?)</label>", b, re.S):
            label = text(re.sub(r"<span id='popup-price'>.*", '', v.group(2), flags=re.S))
            sizes.append({'name': label, 'price': money(attr(v.group(1), 'price')), 'plu': attr(v.group(1), 'plu')})
        it['sizes'] = sizes if len(sizes) > 1 else []
        groups, cur = [], None
        for t in re.finditer(r"<p[^>]*>(.*?)</p>|(<input[^>]*name='item-option-radio[^>]*>)\s*<label[^>]*>(.*?)</label>", b, re.S):
            if t.group(1) is not None:
                label = text(t.group(1))
                if label and label != '0' and 'data-dismiss' not in t.group(0):
                    cur = {'label': label, 'options': []}
                    groups.append(cur)
                continue
            inp, label = t.group(2), text(t.group(3))
            priced = re.match(r'(.*?)\s*-\s*\$([\d.]+)$', label)
            name, extra = (priced.group(1), priced.group(2)) if priced else (label, attr(inp, 'value') or '0')
            if cur is None:
                cur = {'label': 'Options', 'options': []}
                groups.append(cur)
            if 'checkbox' in inp:
                cur['min'], cur['max'] = int(attr(inp, 'min-io') or 0), int(attr(inp, 'max-io') or 1)
            else:
                cur['min'], cur['max'] = 1, 1
            cur['options'].append({'name': name, 'price': money(extra or 0)})
        it['groups'] = [g for g in groups if g['options']]
        items.append(it)
    return items


def parse_deal(popup):
    """A pack's choices, in order: (option names) for each choice the customer makes."""
    out, seen = [], {}
    for sid, label in re.findall(r'selection-section-id="(\d+)" selection-label="([^"]*)"', popup):
        names = [text(n) for n in re.findall(r'selection-id="%s"[^>]*>\s*<p[^>]*>(.*?)<span' % sid, popup, re.S)]
        # "Cook Option - Cod 6" sometimes comes with no options; it asks what Cod 1-5 asked.
        stem = re.sub(r'\s*\d+$', '', H.unescape(label).strip())
        names = names or (seen.get(stem) if stem != H.unescape(label).strip() else None)
        if names:
            seen[stem] = names
            out.append(names)
    return out


def build(page, deals):
    cats = [text(c) for c in re.findall(r'<h1[^>]*>([^<]*)</h1>', page)]
    cats = [c for c in cats if c and c not in SKIP_CATEGORIES]
    items = parse_items(page)

    groups = {}   # name -> {min, max, repeat, options}

    def use_group(label, options, lo, hi):
        name = GROUP_NAMES.get(label, label)
        g = groups.setdefault(name, {'name': name, 'min': lo, 'max': hi, 'repeat': False, 'options': []})
        for o in options:
            if o['name'] not in [x['name'] for x in g['options']]:
                g['options'].append(o)
        link = {'name': name}
        if (lo, hi) != (g['min'], g['max']):
            link.update(min=lo, max=hi)
        return link

    out = []
    for it in items:
        row = {
            'category': it['category'], 'name': it['name'], 'plu': it['plu'],
            'description': it['description'] or None, 'image_url': it['image_url'],
            'price': None if it['sizes'] else money(it['price']),
            'sizes': sorted(it['sizes'], key=lambda s: s['price']),
            'groups': [use_group(g['label'], g['options'], g['min'], g['max']) for g in it['groups']],
        }
        if it['deal']:
            choices = deals.get(it['plu'], [])
            # The same question asked again ("Choose your second fish") is one choice made n times.
            runs = []
            for names in choices:
                key = frozenset(names)
                if runs and runs[-1][0] == key:
                    runs[-1][1] += 1
                else:
                    runs.append([key, 1, names])
            for key, n, names in runs:
                name = DEAL_GROUPS.get(key)
                if not name:
                    sys.exit(f'{it["name"]}: no group name for the choice {sorted(key)}; add it to DEAL_GROUPS')
                g = groups.setdefault(name, {'name': name, 'min': 1, 'max': 1, 'repeat': False,
                                             'options': [{'name': x, 'price': 0} for x in names]})
                link = {'name': name}
                if (n, n) != (g['min'], g['max']):
                    link.update(min=n, max=n)
                if n > 1:
                    link['repeat'] = True
                row['groups'].append(link)
        out.append(row)

    missing = sorted({r['category'] for r in out} - set(cats))
    return {
        'source': SITE,
        'categories': [{'name': c} for c in cats + missing if any(r['category'] == c for r in out)],
        'groups': list(groups.values()),
        'items': out,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--html', help='a saved copy of the home page')
    ap.add_argument('--deals', help='a folder of saved pack popups, one <PLU>.html each')
    args = ap.parse_args()

    site = None if args.html else Site()
    page = open(args.html).read() if args.html else site.get('/')
    deals = {}
    for it in parse_items(page):
        if not it['deal']:
            continue
        if args.deals:
            path = os.path.join(args.deals, it['plu'] + '.html')
            popup = open(path).read() if os.path.exists(path) else ''
        else:
            popup = site.get('/core/ajax/deals_popup.php', {'menu_id': it['deal']['menu'], 'deal_id': it['deal']['id'], 'deal_plu': it['plu']})
        deals[it['plu']] = parse_deal(popup)
        if not deals[it['plu']]:
            print(f'warning: no choices found for {it["name"]}', file=sys.stderr)

    menu = build(page, deals)
    json.dump(menu, sys.stdout, indent=1, ensure_ascii=False)
    print()
    print(f"{len(menu['items'])} items in {len(menu['categories'])} categories, {len(menu['groups'])} option groups",
          file=sys.stderr)


if __name__ == '__main__':
    main()
