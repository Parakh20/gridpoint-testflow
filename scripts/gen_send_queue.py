#!/usr/bin/env python3
"""Regenerate docs/sales/SEND_QUEUE.md.

Joins the flat contact export (docs/sales/outreach_contacts.csv) against the
per-company research already sitting in the leads seed migration, so every
message in the queue has a hook and an angle attached and none of them has to
be written generically.

Deliberately collapses to ONE contact per company. The CSV holds 36 PUBLISHED
addresses across 24 companies -- several publish a named MD alongside info@ and
sales@. Mailing all of them at one company reads as spray to a human and burns
the good address along with the throwaway ones, so the extras are carried as
bounce fallbacks instead of as additional sends.

Run from the repo root:  python3 scripts/gen_send_queue.py
"""

import collections
import csv
import pathlib
import re

REPO = pathlib.Path(__file__).resolve().parent.parent
CSV_PATH = REPO / 'docs/sales/outreach_contacts.csv'
SEED_PATH = REPO / 'supabase/migrations/20260530000004_seed_leads.sql'
OUT_PATH = REPO / 'docs/sales/SEND_QUEUE.md'

PER_DAY = 12  # 24 companies over two days, well inside the ~20/day ceiling.

# Preference order when a company publishes only role inboxes and no human.
ROLE_RANK = ['md', 'director', 'ceo', 'enquiry', 'info', 'contact', 'sales', 'careers']

LEADS_COLUMNS = 12  # company_name .. source_url, per the seed's INSERT


def split_tuple(text):
    """Split one SQL VALUES row on commas outside single quotes."""
    out, buf, quoted, i = [], '', False, 0
    while i < len(text):
        c = text[i]
        if c == "'":
            if quoted and i + 1 < len(text) and text[i + 1] == "'":
                buf += "''"
                i += 2
                continue
            quoted = not quoted
            buf += c
        elif c == ',' and not quoted:
            out.append(buf.strip())
            buf = ''
        else:
            buf += c
        i += 1
    out.append(buf.strip())
    return out


def unquote(value):
    value = value.strip()
    if value.upper() == 'NULL':
        return ''
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1].replace("''", "'")
    return value


def load_leads():
    seed = SEED_PATH.read_text(encoding='utf-8')
    leads = {}
    for match in re.finditer(r"^\s*\(('.*?)\),?\s*$", seed, re.M | re.S):
        parts = split_tuple(match.group(1))
        if len(parts) != LEADS_COLUMNS:
            continue
        v = [unquote(p) for p in parts]
        leads[v[0]] = dict(segment=v[1], region=v[2], why_fit=v[4],
                           buyer_title=v[5], approach=v[8], priority=v[9], url=v[11])
    return leads


def normalise(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def match_lead(company, leads):
    """CSV company names and seed company names differ in suffixes and
    punctuation, so fall back to a containment match on the normalised form."""
    if company in leads:
        return leads[company]
    needle = normalise(company)
    for name, lead in leads.items():
        hay = normalise(name)
        if needle and (needle in hay or hay in needle):
            return lead
    return {}


def contact_score(row):
    """Lower sorts first: flagged primary, then a named human, then role rank."""
    score = 0
    if (row.get('primary') or '').strip().lower() == 'yes':
        score -= 100
    if (row.get('name') or '').strip():
        score -= 50
    local = row['email'].split('@')[0].lower()
    for i, key in enumerate(ROLE_RANK):
        if key in local:
            score -= (len(ROLE_RANK) - i)
            break
    return score


def build_entries():
    rows = list(csv.DictReader(CSV_PATH.open(encoding='utf-8')))
    published = [r for r in rows
                 if (r.get('email_status') or '').strip() == 'PUBLISHED'
                 and (r.get('email') or '').strip()]
    leads = load_leads()

    by_company = collections.OrderedDict()
    for row in published:
        by_company.setdefault(row['company'], []).append(row)

    entries = []
    for company, contacts in by_company.items():
        contacts.sort(key=contact_score)
        lead = match_lead(company, leads)
        priority = int(contacts[0].get('priority') or lead.get('priority') or 0)
        entries.append(dict(company=company, priority=priority, lead=lead,
                            to=contacts[0], alternates=contacts[1:]))

    # Highest priority first; a named human outranks a role inbox at equal priority.
    entries.sort(key=lambda e: (-e['priority'],
                                0 if (e['to'].get('name') or '').strip() else 1,
                                e['company']))
    return entries, len(published)


def clean(value):
    return (value or '').strip()


def render(entries, published_count):
    out = ['# Send queue — first campaign\n']
    out.append(f'''Generated from `outreach_contacts.csv` joined against the `leads` seed
(`20260530000004_seed_leads.sql`). Regenerate with `scripts/gen_send_queue.py`.

**One message per company, not per address.** The {published_count} PUBLISHED addresses collapse
to **{len(entries)} companies** — Akuntha alone publishes three. Mailing every address at one
company reads as spray and burns the best contact along with the worst. The extra
addresses are listed as bounce fallbacks, not as additional sends.

Rules that still apply, from `OUTREACH_SENDING_PLAN.md`:

- PUBLISHED addresses only. The UNVERIFIED rows are directory-sourced or
  inferred and are not in this queue.
- ~20/day maximum, spaced through the day, never a burst.
- Log every send as a `lead_activities` row, channel `EMAIL`. That log is what
  Phase 2 automation reads; without it this campaign leaves no trace.
- Hand-write each one. `Angle` below is the per-company research already done —
  it exists so no message has to be generic.
''')

    days = [entries[i:i + PER_DAY] for i in range(0, len(entries), PER_DAY)]
    for day_no, chunk in enumerate(days, 1):
        out.append(f'\n## Day {day_no} — {len(chunk)} companies\n')
        for i, entry in enumerate(chunk, 1):
            to, lead = entry['to'], entry['lead']
            who = clean(to.get('name')) or '(role inbox)'
            title = clean(to.get('title'))
            out.append(f"### {i}. {entry['company']}  · priority {entry['priority']}\n")
            out.append(f"**To:** `{to['email']}` — {who}" + (f", {title}" if title else "") + "\n")
            if entry['alternates']:
                fallbacks = ", ".join(f"`{a['email']}`" for a in entry['alternates'])
                out.append(f"**If it bounces:** {fallbacks}\n")
            if lead.get('segment'):
                out.append(f"**Who they are:** {clean(lead['segment'])} · {clean(lead['region'])}\n")
            if lead.get('why_fit'):
                out.append(f"**Hook:** {clean(lead['why_fit'])}\n")
            if lead.get('approach'):
                out.append(f"**Angle:** {clean(lead['approach'])}\n")
            if clean(to.get('notes')):
                out.append(f"**Note:** {clean(to['notes'])}\n")
            if lead.get('url'):
                out.append(f"**Source:** {clean(lead['url'])}\n")
            out.append("")

    out.append('''
## Sending checklist

Per message, before hitting send:

- [ ] Names the company's actual work — the Hook line, not "your organisation"
- [ ] Says where the address came from (their website). Honesty is cheap and it
      is what DPDP-era compliance looks like in practice
- [ ] Carries a real signature: name, Optimus Testing, optimustesting.com, phone
- [ ] Has a plain opt-out line — "reply STOP and I won't write again" — and it
      gets honoured permanently
- [ ] Logged as a `lead_activities` row afterwards

Expected, per `OUTREACH_SENDING_PLAN.md`: a handful of replies, 1-3 demos. The
named contacts are worth more effort than the role inboxes.
''')
    return '\n'.join(out)


def main():
    entries, published_count = build_entries()
    OUT_PATH.write_text(render(entries, published_count), encoding='utf-8')
    named = sum(1 for e in entries if clean(e['to'].get('name')))
    print(f'wrote {OUT_PATH.relative_to(REPO)}')
    print(f'{len(entries)} companies from {published_count} published addresses '
          f'({named} addressed to a named person)')


if __name__ == '__main__':
    main()
