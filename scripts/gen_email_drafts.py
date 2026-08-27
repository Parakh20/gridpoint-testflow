#!/usr/bin/env python3
"""Regenerate docs/sales/EMAIL_DRAFTS.md — one ready-to-paste message per company.

Shares its data layer with gen_send_queue.py: the same CSV-to-leads-seed join,
the same one-contact-per-company collapse. This script only adds the copy.

The hook line is drafted mechanically from the `why_fit` research, which is
written as notes rather than prose. Every draft therefore carries a REWRITE
marker on that line. A hook that reads like a script assembled it is worse than
no hook at all, because the entire claim of the message is that a human wrote it.

Run from the repo root:  python3 scripts/gen_email_drafts.py
"""

import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / 'scripts'))

from gen_send_queue import build_entries, clean  # noqa: E402  (path set above)
from outreach_hooks import hook_for  # noqa: E402

OUT_PATH = REPO / 'docs/sales/EMAIL_DRAFTS.md'

SIGNATURE = """Parakh Sharma
Optimus Testing
+91 94135 52887"""

# Words that start the generic tail of a company name. "Akuntha Projects Pvt Ltd"
# and "Transerect Testing & Commissioning Engineers Pvt Ltd" both need to reach a
# subject line, and neither the legal suffix nor the sector description belongs
# there.
NAME_TAIL = {'testing', 'commissioning', 'engineers', 'engineering', 'consultants',
             'projects', 'services', 'solutions', 'power', 'infra', 'electricals',
             'electrical', 'laboratories', 'labs', 'group', 'pvt', 'ltd', 'limited',
             'co', 'company', '&', 'and'}


def short_name(company):
    """The name a person would actually say out loud.

    Possessive forms are avoided entirely at the call site -- "Akuntha Projects's"
    was the earlier output, which is both wrong and long.
    """
    words = company.replace('/', ' ').split()
    kept = []
    for w in words:
        if w.strip('.,').lower() in NAME_TAIL and kept:
            break
        kept.append(w.strip('.,'))
    return ' '.join(kept) if kept else company


def domain_of(email):
    return email.split('@', 1)[1] if '@' in email else email


def salutation(contact):
    """Surname-only where a full name is known; Indian business correspondence
    reads 'Mr Kamdar' as respectful and 'Dear Ravi' as presumptuous from a
    stranger. No name means no salutation to guess at."""
    name = clean(contact.get('name'))
    if not name:
        return 'Hello'
    parts = [p for p in re.split(r'\s+', name) if len(p.rstrip('.')) > 1]
    return f'Mr {parts[-1]}' if parts else 'Hello'


def short_region(region):
    return clean(region).split('(')[0].strip().rstrip(',')


def research_lines(lead):
    """The raw research for one company, for the sender to turn into a sentence.

    Deliberately NOT assembled into prose. `why_fit` and `segment` are research
    notes -- fragments, ampersands, "=" shorthand -- and every template that
    tried to splice them into a sentence produced broken English ("an ePC",
    "a t&C specialist"). Half-grammatical text in a message whose entire claim
    is that a person wrote it is worse than an obvious blank, because the reader
    notices and concludes the opposite.
    """
    out = []
    segment = clean(lead.get('segment'))
    region = short_region(lead.get('region', ''))
    if segment:
        out.append(f"{segment}" + (f" · {region}" if region else ""))
    for field, label in (('why_fit', 'Why they fit'), ('approach', 'Angle')):
        value = clean(lead.get(field))
        if value:
            out.append(f"{label}: {value}")
    return out


HOOK_PLACEHOLDER = '{HOOK — one sentence naming their actual work. See research above.}'


BODY_NAMED = """I'm Parakh Sharma, at IIT Bombay. I've built TestFlow — commissioning software
for substation testing teams. I got your address from {domain}.

What it does: your engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later from whatever is on which laptop.

{hook}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?"""

BODY_ROLE = """I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{hook}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?"""

OPT_OUT_NAMED = "If you'd rather not hear from me, reply STOP and I won't write again."
OPT_OUT_ROLE = "Reply STOP and I won't write again."


def render_draft(entry):
    to = entry['to']
    named = bool(clean(to.get('name')))
    hook = hook_for(entry['company']) or HOOK_PLACEHOLDER

    if named:
        subject = f"Commissioning test records at {short_name(entry['company'])} — from IIT Bombay"
        body = BODY_NAMED.format(domain=domain_of(to['email']), hook=hook)
        opt_out = OPT_OUT_NAMED
    else:
        subject = 'For your T&C head — commissioning software from IIT Bombay'
        body = BODY_ROLE.format(hook=hook)
        opt_out = OPT_OUT_ROLE

    return subject, f"{salutation(to)},\n\n{body}\n\n{SIGNATURE}\n\n{opt_out}"


def main():
    all_entries, published_count = build_entries()
    # Phase 1 is small companies only -- see the reasoning in SEND_QUEUE.md.
    # A listed EPC's procurement cycle outlasts a pre-revenue runway however
    # well the product fits, so the large firms get no draft until there is a
    # reference customer to name.
    entries = [e for e in all_entries if e['tier'] in ('SMALL', 'MID')]
    deferred = len(all_entries) - len(entries)

    out = ['# Email drafts — first campaign\n']
    out.append(f'''One message per company. {len(entries)} drafts — small and mid-size firms
only, with {deferred} large or listed companies deferred (see
[SEND_QUEUE.md](SEND_QUEUE.md) for why). Generated from
`outreach_contacts.csv` and the `leads` seed. Regenerate with
`python3 scripts/gen_email_drafts.py`. Templates and the reasoning behind the
copy: [EMAIL_TEMPLATES.md](EMAIL_TEMPLATES.md). Addresses and bounce fallbacks:
[SEND_QUEUE.md](SEND_QUEUE.md).

**These are complete — no blanks left to fill.** The hook sentence in each, the
one line that proves a person read their website, is hand-written per company in
`scripts/outreach_hooks.py` from the research shown beneath each draft. Read it
before sending anyway: if anything on their site has changed, the hook is the
sentence that will be wrong, and it is the one the prospect will quote back.

Two other rules, repeated here because they are easy to lose while pasting:
send plain text with no attachment, and never imply a customer that doesn't
exist yet.
''')

    for i, entry in enumerate(entries, 1):
        to = entry['to']
        subject, message = render_draft(entry)
        research = research_lines(entry['lead'])

        out.append(f"\n---\n\n## {i}. {entry['company']}\n")
        out.append(f"**To:** `{to['email']}`"
                   + (f" — {clean(to['name'])}, {clean(to['title'])}" if clean(to.get('name'))
                      else f" — {clean(to.get('title')) or 'role inbox'}")
                   + f"  ·  priority {entry['priority']}\n")
        if entry['alternates']:
            out.append("**If it bounces:** "
                       + ", ".join(f"`{a['email']}`" for a in entry['alternates']) + "\n")
        out.append(f"**Subject:** `{subject}`\n")
        if research:
            out.append("**Research — turn one of these into the hook sentence:**\n")
            for line in research:
                out.append(f"- {line}")
            out.append("")
        out.append("```\n" + message + "\n```\n")

    out.append('''
---

## After sending each one

Log a `lead_activities` row, channel `EMAIL`. Without it the campaign leaves no
record, and Phase 2 automation has nothing to read.

One follow-up on the same thread after five to seven working days, never a
second. Any reply cancels every later step for that contact.
''')

    OUT_PATH.write_text('\n'.join(out), encoding='utf-8')
    named = sum(1 for e in entries if clean(e['to'].get('name')))
    print(f'wrote {OUT_PATH.relative_to(REPO)}')
    print(f'{len(entries)} drafts ({named} to a named person, '
          f'{len(entries) - named} to role inboxes); '
          f'{deferred} large firms deferred; {published_count} published addresses total')


if __name__ == '__main__':
    main()
