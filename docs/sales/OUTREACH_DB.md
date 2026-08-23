# Outreach contact database

## What this is

`leads` (88 target companies, seeded May 2026) had **zero email addresses** — every
row was company/segment/why-fit research with `contact_email` NULL. This adds the
contact layer: who to email, at which address, and how much to trust that address.

- **Schema:** `supabase/migrations/20260823000005_lead_contacts.sql`
- **Data:** `supabase/migrations/20260823000006_seed_lead_contacts.sql` +
  `20260823000007_lead_contact_phones.sql` — **61 contacts across 32 companies:
  41 with an email, 22 with a phone number, 10 of those mobiles** (so WhatsApp is
  open).
- **Flat export for sending:** `docs/sales/outreach_contacts.csv`
- **UI:** Platform admin → Sales → open a lead → **Contacts** section (add, set
  primary, remove).

## The rule that shapes this data

**No address here is a `first.last@company.com` guess.** Every one was read off a
live page. Guessed addresses bounce, and bounces damage the sending domain's
reputation for every campaign after them — a cold-outreach domain that starts
bouncing gets filtered, and that is expensive to undo.

`email_status` records the provenance:

| Status | Meaning | Safe to cold-email? |
|---|---|---|
| `PUBLISHED` | Read off a page the company controls | Yes |
| `UNVERIFIED` | Third-party directory/registry, or a name→mailbox mapping that was inferred | Verify first |
| `BOUNCED` | Send failed — stop using it | No |
| `OPTED_OUT` | They asked us to stop | No, ever |

Where a decision maker is known by name but publishes no address (common — most
Indian EPCs publish only `info@`), the contact is stored as **a name with a NULL
email**. That is still useful: address the generic inbox to that person by name,
or approach on LinkedIn.

## Where the coverage is, and where it isn't

**Best contacts (named decision maker + own-domain address):**

| Company | Contact | Address | Phone |
|---|---|---|---|
| Transerect T&C | **S. V. Mahendra, Managing Director** | `mahendra@transerect.com` | +91 98450 21735 (mobile) |
| Akuntha Projects | Ravi Kamdar, Managing Director | `ravi@akuntha.com` | +91 94264 02423 (mobile) |
| HEC Infra Projects | Electrical division inbox | `elect@hecproject.com` | +91-79-40086771 |
| INEL Power Group | Anand Varma + regional inboxes | `anandvarma@inelpse.com` | +91 44 2371 2710 |

**Transerect is the single best lead in the set**: the MD's own-domain personal
mailbox *and* his mobile, at a firm built purely around T&C since 1992. Akuntha is
second — MD's address plus a mobile. Both are reachable on WhatsApp, which for
this market usually beats email.

### Phones, and why they matter more than they look

In Indian B2B field services WhatsApp is often the primary business channel — the
seeded `outreach_approach` notes say so on lead after lead. A **mobile** number
means WhatsApp is open; a landline does not. The CSV has a `whatsapp_likely`
column computed from the number format.

Watch for **directory call-tracking numbers**: an `079-4xxxxxxx` or `080-46xxxxxx`
line on an IndiaMART or JustDial listing routes through the directory instead of
ringing the company. Reliserv and Vedant both list one; their real numbers are in
the notes. These are flagged, never used as a primary number.

`elect@hecproject.com` is worth calling out — it is the *electrical division*, not
a catch-all, so it lands much closer to the buyer than a generic `info@`.

**Named decision makers with no published address** (address the generic inbox to
them, or go via LinkedIn): N. V. Satyanarayana (Founder/MD, Powertest Asia),
Sasant Nuthakki (Executive Director, Powertest Asia), Chiragkumar Patel
(Chairman/MD/CFO, Chamunda Electrical), Manoj Shinde (Proprietor, Omnific), Mr.
Rathi (Director, Reliserv).

**Structural gap — the large EPCs.** Hartek, KEC, Kalpataru, NCC, Techno Electric,
Tata Projects, Power Mech and the rest publish exactly one `info@` and nothing
else. The actual buyer there is a Head of Commissioning whose address is never
public. Cold email to `info@` at that size converts poorly; those accounts need a
LinkedIn Sales Navigator route or an event/warm intro, which is what the existing
`outreach_approach` field on each lead already says. **The small and mid-size pure
T&C firms are the reachable segment, and that is also the better ICP** — the
founder reads their own mail and can decide alone.

**Not covered.** ~60 of the 88 leads have no contact yet. Most are IndiaMART or
directory listings with no independent website, where the phone number in
`leads.contact_phone` is the only channel and email would have to come from a paid
data provider. State transcos (PSTCL, APTRANSCO, TSTRANSCO, CSPTCL, UPPCL, MSEDCL)
buy through tender, not cold email, so they were deliberately deprioritised.

## Data-quality fixes found while researching

These are wrong in the existing `leads` rows and worth correcting:

- **MEIL** — `meghaengineering.com` is now a parked domain for sale. Their live
  site is elsewhere; the seeded `source_url` is dead.
- **Kalpataru Projects** — `kalpatarulimited.com` does not resolve. Correct domain
  is `kalpataruprojects.com`.
- **HEC Infra Projects** — live site is `hecprojects.in` (mail on
  `hecproject.com`); the seeded `source_url` points at a news article, not the
  company.
- **Reliserv Solution India** — `reliservsolutions.com` has an **expired TLS
  certificate**, so their own site is unreachable in a browser. Worth mentioning
  as a warm opener.
- **Transerect** — has a real site at `transerect.com`; the lead only had an
  IndiaMART link. Same for **Sun and Jay** (`sunjay.in`).
- **MST Electrical Services** — the lead says Sahibabad, Ghaziabad, but the only
  registered "MST Electrical Services Pvt Ltd" is in Anand, Gujarat with different
  directors. Two different entities; no contact was assigned pending a check.
- **ARRAA Energy / GK Expertise** — both publish `+91 99940 54198`. Either shared
  reception or one listing is stale. Confirm before dialling.

## Adding to it

Preferred path is the Sales tab UI. Adding a contact by hand always writes
`email_status = 'UNVERIFIED'` — only promote it to `PUBLISHED` after seeing the
address on the company's own site, and set `BOUNCED`/`OPTED_OUT` as soon as either
happens rather than deleting the row, so the same bad address is not re-added
later.

Setting a contact primary also mirrors it onto `leads.contact_name/email/phone`,
which is what the leads list column renders.


## Self-serve signups are not leads

`/start-trial` lets a company sign up with no sales involvement, so `companies`
now contains tenants with no `leads` row. The pipeline counts above therefore
describe *outreach*, not *all customers*.

These are not auto-converted into leads. A signup is a customer, not a prospect —
writing it into the outreach pipeline would corrupt exactly the record this
contact book exists to keep ("who have we actually contacted, and how did it
go"). Instead the Sales tab shows a **Self-serve signups** panel listing
companies no lead points at, with a name-match suggestion where one exists.
Linking a company to the lead that won it is a one-click action that also closes
that lead at `WON` — but it stays a human decision, because company names
collide.
