# SEO Plan — optimustesting.com

Goal: rank in the top 3 results for "substation commissioning software India", "electrical testing report software", and the long-tail buyer-intent queries on those topics, within 6–9 months of consistent execution.

This is a niche B2B audience (a few thousand companies in India + adjacent markets). We don't need millions of impressions — we need the right 2,000.

---

## 1. Technical SEO (done in this commit)

| Item | Status | Where |
|---|---|---|
| Single canonical URL (`https://optimustesting.com/`) | ✅ | `frontend/index.html` |
| Marketing-specific `<title>` + `<meta description>` | ✅ | `frontend/index.html` |
| Open Graph + Twitter card metas | ✅ | `frontend/index.html` |
| Schema.org JSON-LD (Organization + SoftwareApplication) | ✅ | `frontend/index.html` |
| `robots.txt` allowing apex, with sitemap reference | ✅ | `frontend/public/robots.txt` |
| `sitemap.xml` with all anchor sections | ✅ | `frontend/public/sitemap.xml` |
| Runtime `noindex` for admin + tenant subdomains | ✅ | `frontend/index.html` script tag |
| Semantic HTML (`<header>`, `<section>`, `<footer>`) | ✅ | `frontend/src/pages/Marketing.tsx` |
| Mobile responsive (Tailwind breakpoints throughout) | ✅ | `Marketing.tsx` |
| Apex serves marketing (no redirect to subdomain that loses link equity) | ✅ | `App.tsx` |

### Still to do
- **Create `og-image.png`** (1200×630) and `logo.png` — referenced in `index.html` but files don't exist yet. Without them, link previews on LinkedIn/X/WhatsApp look broken.
- **Wire `react-helmet-async`** if you want per-section dynamic titles (e.g. `/#pricing` → "Pricing — Optimus Testing"). Not critical at v1; static `<title>` is fine for a single-page marketing site.
- **Submit sitemap** to Google Search Console + Bing Webmaster Tools once DNS is live.
- **Add `<link rel="alternate" hreflang="en-IN">`** if you eventually localize.
- **Lighthouse pass** — verify Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms). The hero image is a Tailwind gradient, not a real image, so LCP should already be excellent.

---

## 2. Keyword strategy

### Primary keywords (high intent, fightable difficulty)
| Keyword | Monthly volume (est, IN) | Difficulty | Intent |
|---|---|---|---|
| substation commissioning software | 200–500 | medium | high |
| electrical testing software for substation | 100–300 | low–med | high |
| commissioning report software India | 50–200 | low | high |
| transformer testing report format | 1,000+ | low | medium |
| CT testing software | 100–300 | low | medium |

These are realistic. There's no English-speaking incumbent owning these terms in India today (mostly PDFs from OEMs ranking).

### Long-tail / blog-driven
- "How to write a commissioning test report"
- "Voltage ratio test acceptance criteria"
- "Tan delta values for power transformer interpretation"
- "SF6 circuit breaker timing test procedure"
- "Free commissioning report template"
- "Difference between FAT, SAT, commissioning, pre-commissioning"

These pull commissioning engineers / supervisors into the funnel. Each post embeds product hooks ("doing this manually? See how TestFlow auto-generates the report ↗").

### Geo modifiers (local SEO)
- "substation commissioning company in [city]"
- "electrical testing services Mumbai / Delhi / Chennai / Bengaluru / Pune / Ahmedabad"
- "commissioning contractor Tamil Nadu / Maharashtra / Gujarat"

Even if you don't *do* commissioning yourself, ranking for these brings the right buyers (commissioning contractors searching to benchmark their own SEO will find your site).

---

## 3. On-page content roadmap (first 12 weeks)

Build one focused blog post per week. Each is also a downloadable "asset" (PDF) gated behind an email → feeds the demo funnel.

| Week | Title | Asset |
|---|---|---|
| 1 | "The complete substation commissioning checklist (220 kV → 33 kV)" | PDF checklist |
| 2 | "How to interpret tan delta values on power transformers" | Reference card |
| 3 | "SF6 breaker timing test: procedure, acceptance, common errors" | Procedure PDF |
| 4 | "Commissioning vs pre-commissioning vs FAT/SAT: definitions that matter on site" | Glossary |
| 5 | "Voltage ratio test: deviation limits and what they tell you about a transformer" | – |
| 6 | "CT analyzer test report format — what your client actually wants to see" | Sample report |
| 7 | "From paper test sheets to digital: why most teams stall (and how to actually migrate)" | Migration guide |
| 8 | "Magnetic balance test HV / LV: practical guide" | – |
| 9 | "AI-drafted handover reports: a case study with 4 substations" | Case study |
| 10 | "Audit-ready commissioning: what utilities and EPCs ask for in 2026" | Buyer checklist |
| 11 | "Field engineer onboarding for digital test sheets: a 30-day plan" | Onboarding template |
| 12 | "Pricing transparency: what commissioning platforms should cost" | Comparison sheet |

Each post: 1,200–1,800 words, one diagram, one internal link to a feature page, one CTA to `/#contact`.

---

## 4. Off-page / link-building

The ranking blockers in this niche aren't keyword density — they're domain authority. Quickest paths to credible backlinks:

1. **Guest posts on power-industry publications** — `powerline.in`, `electricalindia.in`, `energetica-india.net`, `powertechjournal`. Pitch: "Why digital commissioning is the next step for India's grid". Each link from these is worth 100 generic comment-spam backlinks.
2. **Indian Electrical & Electronics Manufacturers Association (IEEMA)** — sponsorship or speaking slot at their annual events. They link to sponsors.
3. **State Electricity Board procurement portals** — getting listed as an approved vendor often comes with a public listing page that links back. Long sales cycle but high authority.
4. **OEM partnerships** — Megger, Doble, Omicron, ABB, Siemens. Even a co-marketing page on their site ("Integrate with TestFlow") is gold.
5. **Industry directories** — `justdial.com` (high authority in India), `indiamart.com`, `tradeindia.com`. Free listings with backlinks.
6. **Original research** — publish "State of substation commissioning in India 2026" survey. Aggregators (`livemint.com`, `business-standard.com`) link to original data.

---

## 5. Performance & Core Web Vitals

Marketing apex MUST hit:
- **LCP < 2.5s** — Hero is text + CSS gradient, no large image. Should be ≤ 1s.
- **CLS < 0.1** — Reserve space for fonts (already preloaded). No JS-injected layout shifts in the marketing page.
- **INP < 200ms** — No heavy JS on the apex. Single-page React tree.

Things to add when traffic grows:
- Self-hosted fonts (cuts a network roundtrip to Google Fonts)
- `loading="lazy"` on any images added below the fold
- Image CDN (Cloudinary / Vercel Image Optimization) for the og-image and any future case-study screenshots
- Pre-rendering the marketing page via `vite-plugin-prerender-spa` or moving the marketing page to Next.js / Astro for true SSR. **Don't do this yet** — current Vite SPA is fine.

---

## 6. Conversion tracking

To know whether SEO is working, instrument the funnel:
1. **Google Analytics 4** — events: `marketing_view`, `demo_form_submit`, `pricing_view`, `cta_click_book_demo`.
2. **Google Search Console** — connect on day 1. Watch impressions per query, average position.
3. **Plausible / Fathom** as a privacy-friendly alternative — same goals.
4. **UTM tags on all outbound** (LinkedIn posts, guest posts, IEEMA listings).

Set the goal: by month 3, organic search delivers ≥ 30% of demo requests. By month 9, ≥ 60%.

---

## 7. The 30-day kickoff sprint

If you can only do one thing per week for the first month, do these in this order:

1. **Week 1** — Create the og-image + logo files. Set up Google Search Console + Bing Webmaster. Submit sitemap. File the LinkedIn company page (link back).
2. **Week 2** — Write blog post #1 (commissioning checklist). Host on `optimustesting.com/blog/[slug]` (new route — see below).
3. **Week 3** — Outreach: pitch one guest post to `powerline.in`. Apply to be listed on IndiaMART + Justdial.
4. **Week 4** — Write blog post #2. Audit Lighthouse. Add LinkedIn share buttons to blog.

For posts to be hosted on-site, the SPA needs a `/blog/[slug]` route fed from Markdown files or a CMS. Suggested route: add a `frontend/src/pages/blog/` folder with MDX files, parse with `@mdx-js/rollup`. Out of scope for this commit; do it before publishing post #1.

---

## 8. Anti-patterns to avoid

- ❌ Don't buy backlinks. Google's spam team has 100% wrecked sites in this niche before. One penalty undoes a year of work.
- ❌ Don't AI-write the blog and ship. Every post needs a domain expert (you / a commissioning engineer) to verify acceptance criteria. Wrong values published under your name = trust collapse.
- ❌ Don't optimize for keyword density. Google's algorithm rewards genuinely useful content, not stuffing.
- ❌ Don't redirect `optimustesting.com` → a subdomain. You lose the SEO weight you're building. Keep the apex as the marketing root forever.
- ❌ Don't run the marketing site as a separate app on a different domain. The current architecture (one SPA, three host-modes) is correct.
