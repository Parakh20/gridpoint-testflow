# TestFlow Pricing Financial Plan — Design Spec

**Date:** 2026-05-28  
**Author:** Parakh Sharma (solo founder)  
**Status:** Approved  
**Related docs:** `PRICING.md`, `SALES_TARGETS.md`

---

## Overview

This document models unit economics, infrastructure costs, break-even thresholds, and 36-month ARR scenarios for TestFlow (Optimus Testing). It is the financial companion to the pricing strategy in `PRICING.md`. Numbers should be reviewed every quarter and updated when actuals become available.

**Pricing model recap:** Per-workspace flat annual fee. Team ₹2,40,000/year · Business ₹6,00,000/year · Enterprise custom. No per-user or per-test metering. Annual upfront payment is the default.

---

## 1. Cost Baseline — Three Phases

Costs are structured in phases keyed to customer count, not calendar time. Each phase boundary triggers a meaningful spend jump.

### Phase 0 — Pre-revenue (current state)

| Line item | Monthly cost |
|---|---|
| Supabase | Free tier |
| Vercel | Hobby (free) |
| EAS (Expo) | Free (limited builds) |
| Email | Supabase built-in SMTP (free) |
| Claude (dev tooling) | Pro plan — ₹1,700 |
| Domain (amortised) | ₹85 |
| Sentry | Free tier |
| **Total** | **~₹1,800/month** |

### Phase 1 — First paying customer through ~4 customers

Infra is upgraded on the day the first payment lands. Treat this as a one-time step-up, not a gradual ramp.

| Line item | Monthly cost | Notes |
|---|---|---|
| Supabase Pro | ₹2,100 | $25/month · 8GB DB, 100K MAU, daily backups |
| Vercel Pro | ₹1,700 | $20/month · commercial custom domains, more build minutes |
| EAS Production | ₹8,300 | $99/month · unlimited builds, OTA updates, priority queue |
| Email | ₹0 | Supabase Pro SMTP included (100 emails/hour — sufficient at this scale) |
| Claude Max 5x | ₹11,000 | $100/month · coding assistant upgrade from Pro |
| Domain (amortised) | ₹85 | — |
| Sentry | ₹0 | Free tier |
| Subtotal | ₹23,185 | — |
| **+10% misc buffer** | **₹2,315** | Razorpay dashboard, misc SaaS, unexpected tooling |
| **Phase 1 total** | **~₹25,500/month** | — |

### Phase 2 — 4+ customers

Claude Max upgrade and monitoring tier are the main drivers. Supabase stays on Pro through ~15 customers; add compute add-ons (~₹1,000/month) around 10+ customers.

| Line item | Monthly cost | Notes |
|---|---|---|
| Supabase Pro | ₹2,100 | May add ₹1,000 compute add-on at 10+ customers |
| Vercel Pro | ₹1,700 | — |
| EAS Production | ₹8,300 | — |
| Email (Resend paid) | ₹1,700 | $20/month · upgrade when invite volume outgrows Supabase SMTP |
| Claude Max 20x | ₹20,000 | $200/month · unlocked after 4–5 paying customers |
| Domain | ₹85 | — |
| Sentry Team | ₹2,200 | $26/month · needed for production error tracking with customers |
| Subtotal | ₹36,085 | — |
| **+10% misc buffer** | **₹3,615** | — |
| **Phase 2 total** | **~₹40,000/month** | Rounds up to ₹43,000 once Supabase compute add-on kicks in |

### Phase 3 — 15+ customers (planning horizon, not modelled in detail)

At this scale: consider Supabase Team plan ($599/month ≈ ₹50,000) for SOC2 compliance evidence needed by enterprise buyers. First support/sales hire likely needed. Budget ₹80,000–₹1,20,000/month total opex before payroll.

---

## 2. Unit Economics

### Revenue per customer

| Tier | Annual fee | MRR equivalent | Cash on signing (annual upfront) |
|---|---|---|---|
| Team | ₹2,40,000 | ₹20,000 | ₹2,40,000 |
| Business | ₹6,00,000 | ₹50,000 | ₹6,00,000 |
| Enterprise | custom (₹12L+) | ₹1,00,000+ | negotiated |

> **Cash timing note:** Payments are annual upfront. A new Team customer means ₹2.4L cash arrives on day 1 — not ₹20K/month. The "MRR equivalent" column is for tracking ARR and comparing to ongoing costs; it is not a cash flow figure.

### Variable COGS per customer per month

| Cost driver | Per customer/month | Basis |
|---|---|---|
| Razorpay 2% transaction fee (amortised) | ₹400 | 2% × ₹2.4L ÷ 12 months |
| Supabase incremental (DB rows, storage, MAU) | ₹200 | Estimated; low at this data volume |
| Anthropic API (AI reports) | ₹0 | PDF export is client-side React PDF; no API call per report |
| Email (incremental per customer) | ₹0 | Included in Supabase SMTP / Resend flat plan |
| **Total variable COGS** | **~₹600/month** | Team tier |

> Business and Enterprise tiers carry ~₹800–1,000/month variable COGS (higher Razorpay fee on larger contracts, more storage).

### Gross margin by tier

| Tier | MRR equivalent | Variable COGS | **Gross margin** |
|---|---|---|---|
| Team | ₹20,000 | ₹600 | **97%** |
| Business | ₹50,000 | ₹800 | **98.4%** |
| Enterprise | ₹1,00,000 | ₹1,000 | **99%** |

This is a contribution margin — it shows how much each additional customer contributes before fixed costs. Fixed costs are covered by the break-even table below.

### Founder time

Founder time is not modelled as a dollar cost in COGS. The founder has ample capacity and is not a bottleneck at current scale. Re-evaluate when customer count exceeds 20 — that is the signal that support/success overhead is becoming material and a hire is warranted.

---

## 3. Break-even & Milestone Table

All figures assume Team tier (₹20K MRR equivalent) for conservatism. Mixed Business/Enterprise deals improve the numbers.

| Customers | MRR equiv. | Phase costs | **Monthly net** | Milestone |
|---|---|---|---|---|
| 0 | ₹0 | ₹1,800 | −₹1,800 | Pre-revenue baseline |
| 1 | ₹20,000 | ₹25,500 | −₹5,500 | Phase 1 infra step-up; first month is net negative |
| 2 | ₹40,000 | ₹25,500 | **+₹14,500** | ✅ Default alive — infra fully covered |
| 3 | ₹60,000 | ₹25,500 | **+₹34,500** | Comfortable positive cash flow |
| 5 | ₹1,00,000 | ₹40,000 | **+₹60,000** | ✅ Ramen profitable — ₹60K/month founder take-home |
| 8 | ₹1,60,000 | ₹40,000 | **+₹1,20,000** | Solid income, no financial pressure |
| 10 | ₹2,00,000 | ₹43,000 | **+₹1,57,000** | ✅ GST registration threshold (~₹20L cumulative ARR) |
| 15 | ₹3,00,000 | ₹43,000 | **+₹2,57,000** | ₹36L ARR — Year 1 goal from `PRICING.md` |
| 20 | ₹4,00,000 | ₹48,000 | **+₹3,52,000** | Strong PMF signal; begin hiring plan |
| 30 | ₹6,00,000 | ₹55,000 | **+₹5,45,000** | ✅ First hire signal (sales or support) |
| 50 | ₹10,00,000 | ₹65,000 | **+₹9,35,000** | ₹1.2Cr ARR — pre-seed fundraise territory |

**Key insight:** Break-even requires only 2 customers. The business becomes default-alive very quickly — the main risk is not unit economics, it is sales cycle length.

---

## 4. Three-Scenario ARR Model (36 months)

### Scenario assumptions

| | Bear | Base | Bull |
|---|---|---|---|
| Driver | Long enterprise cycles, few pilot conversions | PRICING.md Year 1 goal achieved and continued | One Tier 2 buyer (e.g. Adani, Tata Power) specifies TestFlow; forces contractor adoption |
| Pilot conversion rate | 30% | 50% | 70% |
| Avg monthly new customers | 0.5 | 1.5 | 3.5 |
| Annual churn | 10% | 5% | 3% |

### ARR projection table

| Month | Bear customers | Bear ARR | Base customers | Base ARR | Bull customers | Bull ARR |
|---|---|---|---|---|---|---|
| 3 | 0 | ₹0 | 1 | ₹2.4L | 3 | ₹7.2L |
| 6 | 1 | ₹2.4L | 3 | ₹7.2L | 6 | ₹14.4L |
| 12 | 3 | ₹7.2L | 8 | ₹19.2L | 20 | ₹48L |
| 18 | 6 | ₹14.4L | 15 | ₹36L | 35 | ₹84L |
| 24 | 10 | ₹24L | 25 | ₹60L | 55 | ₹1.32Cr |
| 30 | 15 | ₹36L | 38 | ₹91.2L | 78 | ₹1.87Cr |
| 36 | 20 | ₹48L | 50 | ₹1.2Cr | 100 | ₹2.5Cr |

### What moves you between scenarios

- **Bear → Base:** Converting 1 pilot every 6 weeks instead of every 3 months. Requires a sharper demo and a reference customer to cite.
- **Base → Bull:** A single Tier 2 enterprise (end-client) mandates TestFlow in their contractor RFQs. One such win can add 10–20 workspaces at once. This is the asymmetric upside.

---

## 5. GST & Tax Notes

- **GST registration threshold:** ₹20L cumulative revenue in a financial year. At Team tier, this is ~10 customers (10 × ₹2.4L = ₹24L). Register proactively just before crossing this.
- **GST rate:** 18% on software/SaaS services. Invoice as ₹2,40,000 + ₹43,200 GST = ₹2,83,200 total. The ₹43,200 is collected and remitted — it is not your revenue.
- **Input tax credit:** Supabase, Vercel, EAS billed in USD may not carry GST credits. Claude Max likely billed via Anthropic US — no ITC. Budget that these costs are not offset by ITC.
- **Razorpay GST:** Razorpay's 2% fee also attracts 18% GST on the fee itself (i.e. 2.36% effective). Adjust Razorpay cost estimates upward by ~0.36% of transaction value.

---

## 6. Key Metrics to Track Monthly

| Metric | Target | What it tells you |
|---|---|---|
| **ARR per workspace** | ≥ ₹2L | Discount discipline. If below ₹2L on list price of ₹2.4L, you're at 17% avg discount — acceptable. Below ₹1.4L = stop discounting. |
| **Monthly burn** | Compare to phase threshold | Phase 1: ₹25.5K · Phase 2: ₹40K. If spend creeps above threshold without customer growth, investigate. |
| **Active pilots** | ≤ 5 at any time | Per `PRICING.md` cap. More than 5 concurrent pilots = distraction from real sales. |
| **Pilot → paid conversion rate** | ≥ 50% | Below 40% = product or onboarding problem, not a pricing problem. |
| **Net Revenue Retention** | ≥ 100% | Track from Year 2. NRR > 100% means expansions offset churn. The path there is upselling add-ons and tier upgrades. |
| **Cash in bank** | Always ≥ 6 months of Phase 2 costs | 6 × ₹40K = ₹2.4L minimum buffer. Annual upfront payments help — one signing can refill this immediately. |

---

## 7. Financial Milestones — Summary

| Milestone | Trigger | Action |
|---|---|---|
| **Upgrade infra** | First payment received | Supabase Pro + Vercel Pro + EAS Production on the same day |
| **Default alive** | 2nd customer pays | Business survives indefinitely on current trajectory |
| **Ramen profitable** | 5th customer pays | Founder draws ₹60K/month personal income |
| **GST registration** | ~10th customer or ₹20L cumulative | File GST registration 30 days before crossing threshold |
| **Claude Max 20x** | 4th–5th customer | Reinvest margin into faster product velocity |
| **Sentry Team** | 4th–5th customer | Production error monitoring required for enterprise conversations |
| **First marketing spend** | 8th customer | Budget ₹20K/month for LinkedIn Sales Navigator + targeted outreach tooling |
| **First hire evaluation** | 20–25 customers | Sales + onboarding support; budget ₹80K–₹1.2L/month |
| **Pricing review** | 12 months from first paid customer | Raise Team to ₹3L/year as per `PRICING.md` Year 2 plan |

---

## Appendix: Infra Upgrade Costs (one-time on first customer)

| Item | One-time action | Recurring from that month |
|---|---|---|
| Supabase | Upgrade plan in dashboard | ₹2,100/month |
| Vercel | Upgrade plan in dashboard | ₹1,700/month |
| EAS | Enable Production plan | ₹8,300/month |
| Claude Max 5x | Change subscription | ₹11,000/month |
| Custom SMTP | Configure Supabase SMTP relay or Resend | ₹0–₹1,700/month |

Total step-up on first customer: **+₹23,700/month** compared to pre-revenue baseline. Covered by customer 2's MRR equivalent within the same month.
