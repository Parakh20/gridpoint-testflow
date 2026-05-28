# Pricing Strategy — Optimus Testing (TestFlow)

A pricing framework + recommended numbers for the Indian commissioning-contractor market in year 1. Numbers will move as you learn — that's expected. The shape of the model should stay stable.

---

## The model: per-workspace flat fee, annual

**Recommended unit of pricing**: one workspace (= one company) per year.

Not per-user. Not per-project. Not per-test signature.

Why:
- Indian buyers reflexively reject per-user ("we have 60 engineers, we'd pay ₹X lakhs?!"). It also punishes the right behavior — getting MORE engineers onto the platform is your moat.
- Per-project sounds fair but creates "let's wait until next month to start" friction.
- Flat annual fee aligns with their procurement cycles (annual budgets, not monthly opex).
- One number on the invoice → CFO signs faster.

Tier differentiation is by **scale + features**, not seats.

---

## Recommended tiers (year 1)

| Tier | Annual fee (INR) | Active projects | Users | Key features |
|---|---|---|---|---|
| **Starter** | ₹0 — 14-day trial | 1 | up to 5 | All 46 templates, mobile app, basic reports |
| **Team** | **₹2,40,000** (₹20K/month equivalent) | unlimited | unlimited | + AI handover reports, audit log, soft delete, support SLA 1 business day |
| **Business** | **₹6,00,000** | unlimited | unlimited | + custom templates, SSO (Google/Azure), priority support 4 hr response |
| **Enterprise** | **Custom (₹12,00,000+)** | unlimited | unlimited | + dedicated CSM, on-prem / private cloud option, contractual SLA, custom RBAC |

**Currency: INR**. Show INR on the site for India. Show USD equivalents only on the international landing page if/when you build it.

### What's in every tier (don't gate these)
- All 46 test templates
- Mobile app (both iOS and Android)
- Multi-tenant isolation (RLS) — this is non-negotiable, never sell it as an upsell
- Real-time / 30s polling sync
- Soft delete + restore
- PDF + Excel export

### What can be gated
- AI handover reports (Team and up)
- Audit log viewer UI (Team and up — the data is always captured by triggers, the UI is gated)
- SSO (Business and up)
- Custom templates / white-label (Business and up)
- Priority support / SLA (per tier)
- Dedicated CSM / on-prem (Enterprise only)

---

## What about a free tier?

**Don't ship a permanent free tier.** B2B SaaS with a free tier in a small TAM gets gamed — one consulting individual signs up "personal account", does paid work through it, never converts. The 14-day trial is enough.

If you want a "freemium" lure, do it differently: free public **template library** (downloadable PDFs of all 46 test sheets, no signup) → that drives organic traffic and demonstrates depth → leads to demo requests. Doesn't compete with the product.

---

## Pilot / POC pricing

For Tier 1 contractors (named in `SALES_TARGETS.md`), offer:
- **₹0 for 60 days** on one substation
- Full Team-tier features during pilot
- Must run a real project (not just exploring) — that's the gate
- Pilot includes 2 hours of onboarding from you personally
- At day 50, conversion call. If yes → Team annual contract. If no → polite exit, but you've learned what to fix.

Cap pilots at 5 per quarter early on — they take real time from you.

---

## One-time setup fee

Introduce a **₹25,000 one-time setup fee** for Team and Business tiers.

Why this matters:
- Anchors perceived value (free things feel cheap)
- Covers your time for 1 hour of custom template tweaks + workspace branding
- Filters out tire-kickers
- Indians expect to negotiate — you can waive the setup fee as a "discount", saving headline price

You can choose to waive it for the first 10 paying customers to build case studies.

---

## Add-ons (priced separately)

| Add-on | Price (annual) | Notes |
|---|---|---|
| White-label / custom branding | ₹1,00,000 | Custom domain, logo, color scheme |
| Custom report template | ₹50,000 | One template; per-template |
| Additional AI reports beyond fair-use | ₹500 / report | Fair use = 50/month on Team, unlimited on Business+ |
| Premium support (4 hr business-hour response) | ₹2,00,000 | Standard support is 1 business day |
| Dedicated training session (8 hrs on-site) | ₹50,000 + travel | Per session |
| Data export / migration assistance | ₹25,000 | One-time |
| SSO setup | included in Business+ | – |

---

## Pricing psychology — what to display vs negotiate

On the **website**:
- Show Team price publicly: `₹20,000 / month, billed annually`. Or `₹2,40,000 / year`. Display whichever sounds smaller to your conversion-test audience.
- Business: `Starting at ₹6,00,000 / year`
- Enterprise: `Contact us for a custom quote`

On the **call**:
- Anchor at full price.
- Be willing to discount up to **20%** for a 2-year commitment paid annually.
- Be willing to discount up to **30%** for a 3-year commitment paid upfront.
- **Never** discount more than 30% without an offsetting concession (case study rights, logo on website, reference call).
- Walk away from anyone trying to negotiate >40% off — they'll churn anyway.

### What to NEVER discount
- Multi-tenancy (the RLS isolation is a feature you spend engineering hours on)
- Mobile app (this is a flagship differentiator)
- Audit log capture (compliance argument is strong — never weaken it)

---

## Payment terms

- **Annual upfront** is the default. This is a working-capital advantage for you.
- **Quarterly billing** is a paid concession (Indian buyers will ask): add 5% to the total.
- **Monthly billing** is allowed only for Starter trial → conversion bridge (first 90 days at monthly, then forced annual). Not a permanent option.
- Accept **NEFT/RTGS** (mandatory in India), UPI for small invoices, Razorpay subscriptions (the scaffolding already exists per CLAUDE.md gotcha #36).
- Invoice in **INR with 18% GST** (you'll register as a service provider once revenue crosses ₹20L).
- Net 30 payment terms are standard. Charge 1.5% / month late fee in the contract — most won't ever invoke it, but the threat keeps payments on time.

---

## Pricing evolution roadmap

### Year 1 (now → 12 months from first paid customer)
Goal: 15 paying Team-tier customers, 1–2 Business, 0–1 Enterprise.
Levers: Team @ ₹2.4L is the workhorse. Don't move prices. Iterate on what's IN each tier.

### Year 2
Goal: 50 paying customers, prove pricing power.
Levers:
- Raise Team to ₹3.0L (existing customers grandfathered at old rate for 12 more months)
- Introduce **AI report metering** if usage shows clear power-user concentration
- Launch a "Starter Paid" tier at ₹60K/year for very small contractors (≤ 3 projects, no mobile app, no AI) to capture downmarket

### Year 3
Goal: ₹3+ Cr ARR, ready for international.
Levers:
- Localize pricing for ME (USD) and SE Asia (local currencies)
- True enterprise contracts with custom terms
- Volume discount tier for utilities (PowerGrid / NTPC) — published rate × 0.7 if they buy 20+ workspaces

---

## How to communicate price

Three rules:
1. **Always lead with value, end with price.** "Here's what 15 contractors now use to ship handover reports 4× faster — for ₹2.4L/year per workspace."
2. **Compare to alternatives, not to nothing.** A senior commissioning engineer's day at the keyboard transcribing test sheets = ~₹3,000/day × 60 days saved per year per project = ₹1.8L of recovered time. The platform pays for itself on the first project.
3. **Never apologize for the price.** "₹2.4L for a year" is cheaper than one missed acceptance criteria → re-test → client demerit penalty.

---

## Anti-patterns

- ❌ Don't price per test record. Buyers will refuse to take measurements to avoid the meter.
- ❌ Don't price per equipment instance. Same problem; encourages under-reporting.
- ❌ Don't put pricing behind "request a quote" only. Builds trust to show numbers.
- ❌ Don't add a "popular" tag to Enterprise. Most popular should be Team.
- ❌ Don't bundle SSO with Starter. It's a real cost (Azure Entra/Okta integration support) — gate it to Business.

---

## The single number you should track

**ARR per workspace.**

If ARR per workspace = ₹2L and Team list price = ₹2.4L → you're discounting 17% on average. Acceptable.
If ARR per workspace = ₹1.4L → you're discounting 42%. Either raise prices or change what's in the tier.

Watch this monthly. It tells you whether the price you're publishing is the price you're actually getting.
