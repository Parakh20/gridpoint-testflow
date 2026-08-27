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
        leads[v[0]] = dict(segment=v[1], region=v[2], size_signal=v[3], why_fit=v[4],
                           buyer_title=v[5], approach=v[8], priority=v[9], url=v[11])
    return leads


# Phase 1 targets small teams. A 50-person T&C outfit has one decision maker who
# can say yes on a call; a listed EPC has a procurement process that outlasts a
# pre-revenue runway, however good the fit looks on paper. Size is therefore a
# ranking dimension in its own right and not a by-product of `priority` -- Voltage
# Infra sits at priority 4 with 50-200 staff, below several 400+ engineer firms.
LARGE_MARKERS = ('listed', '1,000+', '1000+', 'invit', 'global', 'large',
                 'multi-lab', 'pan-india', '400+', '750+', '500+ ')
MID_MARKERS = ('200-500', 'mid-size', '300+')


def size_tier(size_signal):
    """SMALL | MID | LARGE from the seed's free-text size_signal.

    Deliberately conservative: anything listed on an exchange is LARGE no matter
    how small the market cap, because the blocker is the procurement process
    rather than the headcount.
    """
    text = (size_signal or '').lower()
    if not text:
        return 'SMALL'  # no scale marker recorded usually means a small outfit
    if any(m in text for m in LARGE_MARKERS):
        return 'LARGE'
    if any(m in text for m in MID_MARKERS):
        return 'MID'
    return 'SMALL'


TIER_ORDER = {'SMALL': 0, 'MID': 1, 'LARGE': 2}


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
                            tier=size_tier(lead.get('size_signal')),
                            to=contacts[0], alternates=contacts[1:]))

    # Small first, then priority, then a named human over a role inbox.
    entries.sort(key=lambda e: (TIER_ORDER[e['tier']],
                                -e['priority'],
                                0 if (e['to'].get('name') or '').strip() else 1,
                                e['company']))
    return entries, len(published)


def clean(value):
    return (value or '').strip()


def render(entries, published_count):
    phase1 = [e for e in entries if e['tier'] in ('SMALL', 'MID')]
    deferred = [e for e in entries if e['tier'] == 'LARGE']

    out = ['# Send queue — first campaign\n']
    out.append(
        'Generated from `outreach_contacts.csv` joined against the `leads` seed\n'
        '(`20260530000004_seed_leads.sql`). Regenerate with `scripts/gen_send_queue.py`.\n\n'
        '## Phase 1 targets small companies only\n\n'
        f'{len(phase1)} of the {len(entries)} companies with a published address, and it is the\n'
        'size filter doing the cutting rather than the fit score. A 50-person T&C outfit\n'
        'has one decision maker who can say yes on a call. A listed EPC has a procurement\n'
        'process that outlasts a pre-revenue runway however well the product fits, and a\n'
        'pilot there is measured in quarters.\n\n'
        f'The {len(deferred)} larger firms are listed at the end. They are not disqualified — they\n'
        'are the wrong *first* customer. Come back to them with a reference.\n\n'
        'Ranking is by size first, not by the `priority` score: Voltage Infra sits at\n'
        'priority 4 with 50-200 staff, above several priority-5 firms with 400+ engineers.\n\n'
        f'**One message per company, not per address.** The {published_count} PUBLISHED addresses\n'
        f'collapse to {len(entries)} companies — Akuntha alone publishes three. Mailing every\n'
        'address at one company reads as spray and burns the best contact along with the\n'
        'worst. The extras are bounce fallbacks, not additional sends.\n\n'
        'Rules from `OUTREACH_SENDING_PLAN.md` that still apply:\n\n'
        '- PUBLISHED addresses only. The UNVERIFIED rows are directory-sourced or inferred\n'
        '  and are not in this queue.\n'
        '- ~20/day maximum, spaced through the day, never a burst. Phase 1 fits in one day.\n'
        '- Log every send as a `lead_activities` row, channel `EMAIL`. Without it the\n'
        '  campaign leaves no record and Phase 2 automation has nothing to read.\n'
        '- Hand-write the hook. `Angle` below is the per-company research already done.\n'
    )

    def block(i, entry):
        to, lead = entry['to'], entry['lead']
        who = clean(to.get('name')) or '(role inbox)'
        title = clean(to.get('title'))
        out.append(f"### {i}. {entry['company']}  · {entry['tier']} · priority {entry['priority']}\n")
        out.append(f"**To:** `{to['email']}` — {who}" + (f", {title}" if title else "") + "\n")
        if entry['alternates']:
            fallbacks = ", ".join(f"`{a['email']}`" for a in entry['alternates'])
            out.append(f"**If it bounces:** {fallbacks}\n")
        for field, label in (('size_signal', 'Size'), ('why_fit', 'Hook'), ('approach', 'Angle')):
            if clean(lead.get(field)):
                out.append(f"**{label}:** {clean(lead[field])}\n")
        if lead.get('segment'):
            out.append(f"**Who they are:** {clean(lead['segment'])} · {clean(lead['region'])}\n")
        if clean(to.get('notes')):
            out.append(f"**Note:** {clean(to['notes'])}\n")
        if lead.get('url'):
            out.append(f"**Source:** {clean(lead['url'])}\n")
        out.append("")

    out.append(f'\n## Phase 1 — {len(phase1)} small and mid-size companies\n')
    for i, entry in enumerate(phase1, 1):
        block(i, entry)

    out.append(f'\n## Deferred — {len(deferred)} large or listed firms\n')
    out.append('Not in the first campaign. Each has a published address ready for the day\n'
               'there is a reference customer to name.\n')
    for entry in deferred:
        size = clean(entry['lead'].get('size_signal')) or 'size unknown'
        out.append(f"- **{entry['company']}** — `{entry['to']['email']}` · {size}")
    out.append("")

    out.append(
        '\n## Sending checklist\n\n'
        'Per message, before hitting send:\n\n'
        '- [ ] Names the company\'s actual work — the Hook line, not "your organisation"\n'
        '- [ ] Says where the address came from (their website)\n'
        '- [ ] Carries a real signature: name, Optimus Testing, phone\n'
        '- [ ] No "reply STOP" boilerplate — it reads as bulk mail. Anyone who asks to\n'
        '      stop is marked OPTED_OUT on their contact instead, which send_outreach_draft\n'
        '      refuses permanently\n'
        '- [ ] Logged as a `lead_activities` row afterwards\n\n'
        'Expected: a handful of replies, 1-3 demos. The named contacts are worth more\n'
        'effort than the role inboxes.\n'
    )
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
