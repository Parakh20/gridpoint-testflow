# Phase 1 Commercial Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TestFlow web app shippable to a first paying client by fixing type safety, wiring error monitoring, enforcing feature gates, creating SEO assets, adding a functional demo request flow, and setting up a blog route.

**Architecture:** Pure frontend changes + one new Supabase migration (demo_requests table). No new backend services. All changes are additive — no existing behaviour removed. Sentry wiring requires the user to supply a DSN; all other tasks are self-contained.

**Tech Stack:** React 18 + Vite + TypeScript, Supabase (Postgres + Edge Functions), TanStack Query v5, shadcn/ui + Tailwind v3, `@sentry/react`, `marked`, `dompurify`

---

## External Prerequisites (you must do these manually before the tasks that depend on them)

| # | Action | Needed by |
|---|---|---|
| A | Run `supabase gen types typescript --project-id hxfilijpaocogsgjrjnq > frontend/src/integrations/supabase/types.ts` from repo root | Task 1 |
| B | Create a free Sentry.io project (React), copy the DSN, add `VITE_SENTRY_DSN=<dsn>` to `frontend/.env` | Task 3 |

---

## File Map

| File | Change |
|---|---|
| `frontend/src/integrations/supabase/types.ts` | Regenerated (external step A) |
| `frontend/src/lib/monitoring.ts` | Uncomment Sentry init/captureException/setUserContext |
| `frontend/package.json` | Add `@sentry/react`, `marked`, `dompurify`, `@tailwindcss/typography` |
| `frontend/src/App.tsx` | Call `initMonitoring()` on app start; add `/blog` and `/blog/:slug` routes |
| `frontend/src/pages/projects/ProjectDetail.tsx` | Gate AI report button with `useFeature('ai_reports')` |
| `frontend/src/pages/dashboards/SuperadminDashboard.tsx` | Wrap AuditLogViewer in `useFeature('audit_log_viewer')` check |
| `frontend/public/og-image.png` | New — 1200×630 social preview |
| `frontend/public/logo.png` | New — 512×512 logo |
| `frontend/src/pages/Marketing.tsx` | Replace mailto contact with real demo request form |
| `frontend/src/pages/blog/BlogIndex.tsx` | New — blog listing page |
| `frontend/src/pages/blog/BlogPost.tsx` | New — blog post renderer (marked + DOMPurify) |
| `frontend/src/pages/blog/posts/index.ts` | New — post registry with first post |
| `supabase/migrations/20260523000001_demo_requests.sql` | New — demo_requests table |
| `.github/workflows/frontend.yml` | Add `tsc --noEmit` check so types can't drift again |
| `frontend/tailwind.config.ts` | Add `@tailwindcss/typography` plugin |

---

## Task 1: Fix TypeScript Errors (stale types)

**Files:**
- Modify: `frontend/src/integrations/supabase/types.ts` (automated)
- Modify: `.github/workflows/frontend.yml`

- [ ] **Step 1: Complete external prerequisite A**

Run from repo root:
```bash
supabase gen types typescript --project-id hxfilijpaocogsgjrjnq > frontend/src/integrations/supabase/types.ts
```

- [ ] **Step 2: Verify zero TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output, exit 0. If errors remain, they are real bugs — fix them before continuing.

- [ ] **Step 3: Add tsc check to CI so types can't drift again**

Open `.github/workflows/frontend.yml`. Find the build step block and add `npx tsc --noEmit` before `npm run build`:

```yaml
      - name: Type-check
        run: npx tsc --noEmit
        working-directory: frontend

      - name: Build
        run: npm run build
        working-directory: frontend
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/integrations/supabase/types.ts .github/workflows/frontend.yml
git commit -m "fix: regenerate supabase types and add tsc check to CI"
```

---

## Task 2: Create OG Image and Logo

**Files:**
- Create: `frontend/public/og-image.png` (1200×630)
- Create: `frontend/public/logo.png` (512×512)

- [ ] **Step 1: Install canvas temporarily**

```bash
cd frontend && npm install --save-dev canvas
```

- [ ] **Step 2: Create the generator script**

Create `scripts/generate-assets.mjs` in repo root:

```js
// One-shot script — run once, then delete.
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join } from 'path';

const OUT = join(process.cwd(), 'frontend/public');

// ── OG Image 1200×630 ──────────────────────────────────────────────────────
{
  const c = createCanvas(1200, 630);
  const ctx = c.getContext('2d');

  // Dark background
  ctx.fillStyle = '#07070c';
  ctx.fillRect(0, 0, 1200, 630);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1200; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 630); ctx.stroke(); }
  for (let y = 0; y < 630; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke(); }

  // Blue-to-purple gradient bar top
  const grad = ctx.createLinearGradient(0, 0, 1200, 0);
  grad.addColorStop(0, '#3b82f6');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 4);

  // Logo mark — circle with "OT" monogram
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath(); ctx.arc(100, 100, 36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OT', 100, 100);

  // Brand name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Optimus Testing', 148, 100);

  // Headline
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Substation Commissioning,', 80, 300);
  ctx.fillText('Done Right.', 80, 380);

  // Subheadline
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '28px sans-serif';
  ctx.fillText('46 test templates · Mobile-first · AI handover reports', 80, 440);

  // Domain badge
  ctx.fillStyle = 'rgba(59,130,246,0.2)';
  ctx.strokeStyle = 'rgba(59,130,246,0.4)';
  ctx.lineWidth = 1;
  roundRect(ctx, 80, 490, 320, 44, 8);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#60a5fa';
  ctx.font = '18px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('optimustesting.com', 100, 512);

  writeFileSync(join(OUT, 'og-image.png'), c.toBuffer('image/png'));
  console.log('✓ og-image.png');
}

// ── Logo 512×512 ────────────────────────────────────────────────────────────
{
  const c = createCanvas(512, 512);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#07070c';
  ctx.fillRect(0, 0, 512, 512);

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#3b82f6');
  grad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(256, 256, 200, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 160px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OT', 256, 256);

  writeFileSync(join(OUT, 'logo.png'), c.toBuffer('image/png'));
  console.log('✓ logo.png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
```

- [ ] **Step 3: Run the script**

```bash
node scripts/generate-assets.mjs
```

Expected output:
```
✓ og-image.png
✓ logo.png
```

- [ ] **Step 4: Verify files exist**

```bash
ls -lh frontend/public/og-image.png frontend/public/logo.png
```

Expected: both files between 30 KB and 300 KB.

- [ ] **Step 5: Uninstall canvas, delete script**

```bash
cd frontend && npm uninstall canvas
rm scripts/generate-assets.mjs
```

- [ ] **Step 6: Commit**

```bash
git add frontend/public/og-image.png frontend/public/logo.png
git commit -m "feat: add og-image and logo for social sharing and SEO"
```

---

## Task 3: Wire Sentry Error Monitoring

**Files:**
- Modify: `frontend/src/lib/monitoring.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/package.json`

**Prerequisite:** Complete external prerequisite B — get Sentry DSN, add to `frontend/.env` as `VITE_SENTRY_DSN=https://...@sentry.io/...`.

- [ ] **Step 1: Install Sentry**

```bash
cd frontend && npm install @sentry/react
```

- [ ] **Step 2: Rewrite monitoring.ts to activate Sentry**

Replace the full content of `frontend/src/lib/monitoring.ts`:

```ts
import * as Sentry from '@sentry/react';

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(err, { extra: context });
  } else {
    console.error('[monitoring]', err, context ?? {});
  }
}

export function setUserContext(
  user: { id: string; email?: string | null; role?: string; companyId?: string } | null,
): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email ?? undefined, role: user.role, company: user.companyId });
  } else {
    Sentry.setUser(null);
  }
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.addBreadcrumb({ message, data, level: 'info' });
}
```

- [ ] **Step 3: Call initMonitoring at app start**

Open `frontend/src/App.tsx`. Add the import near the other lib imports:

```ts
import { initMonitoring } from '@/lib/monitoring';
```

Call it immediately after the import block, before the component definition:

```ts
initMonitoring();
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/monitoring.ts frontend/src/App.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: wire Sentry error monitoring (activate via VITE_SENTRY_DSN)"
```

---

## Task 4: Enforce Feature Gates (AI Reports + Audit Log)

**Files:**
- Modify: `frontend/src/pages/projects/ProjectDetail.tsx`
- Modify: `frontend/src/pages/dashboards/SuperadminDashboard.tsx`

The `useFeature` hook and all flag names already exist in `frontend/src/lib/features.ts`. This task just applies the gates to the two ungated features.

- [ ] **Step 1: Gate AI report in ProjectDetail.tsx**

Open `frontend/src/pages/projects/ProjectDetail.tsx`. Add the import at the top (with other lib imports):

```ts
import { useFeature } from '@/lib/features';
```

Inside the component body (near the other hooks, before the return), add:

```ts
const canGenerateReport = useFeature('ai_reports');
```

Find the Generate Report button block (search for `handleGenerateReport`). It currently looks roughly like:

```tsx
<Button variant="outline" disabled={generatingReport} onClick={handleGenerateReport}>
  {generatingReport ? 'Generating…' : 'Generate AI Report'}
</Button>
```

Wrap it so it only renders when the flag is on:

```tsx
{canGenerateReport && (
  <Button variant="outline" disabled={generatingReport} onClick={handleGenerateReport}>
    {generatingReport ? 'Generating…' : 'Generate AI Report'}
  </Button>
)}
```

- [ ] **Step 2: Gate AuditLogViewer in SuperadminDashboard.tsx**

Open `frontend/src/pages/dashboards/SuperadminDashboard.tsx`. Add import:

```ts
import { useFeature } from '@/lib/features';
```

Inside the component body, add:

```ts
const canViewAuditLog = useFeature('audit_log_viewer');
```

Find `<AuditLogViewer />` and wrap it:

```tsx
{canViewAuditLog && <AuditLogViewer />}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/projects/ProjectDetail.tsx frontend/src/pages/dashboards/SuperadminDashboard.tsx
git commit -m "feat: enforce feature gates on AI reports and audit log viewer"
```

---

## Task 5: Demo Request Form with Supabase Backend

**Files:**
- Create: `supabase/migrations/20260523000001_demo_requests.sql`
- Modify: `frontend/src/pages/Marketing.tsx`

The contact section currently has two `<a>` tags (mailto + tel). Replace with a form that persists to Supabase so no lead is lost. The mailto fallback remains as a secondary option below the form.

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260523000001_demo_requests.sql`:

```sql
-- Demo request leads from the marketing site.
-- Anon can INSERT (public form). No SELECT for anon key (service role reads via platform admin).
create table if not exists public.demo_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  company     text not null,
  phone       text,
  message     text,
  source      text default 'marketing_site'
);

alter table public.demo_requests enable row level security;

create policy "anon_insert_demo_request"
  on public.demo_requests
  for insert to anon
  with check (true);

create index demo_requests_created_at_idx
  on public.demo_requests (created_at desc);
```

- [ ] **Step 2: Apply migration**

```bash
supabase db push
```

Expected: no errors.

- [ ] **Step 3: Add DemoRequestForm component to Marketing.tsx**

Open `frontend/src/pages/Marketing.tsx`. Add a `useState` import if not already present (check the existing React import line and add it if missing).

Add this component definition directly above the main `export default function Marketing()` line:

```tsx
function DemoRequestForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    const { error } = await supabase.from('demo_requests').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim() || null,
    });
    setStatus(error ? 'error' : 'success');
  };

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-white/15 bg-[#07070c]/60 backdrop-blur p-6 md:p-7 text-center">
        <div className="text-4xl mb-3">✓</div>
        <div className="text-white font-semibold text-lg">Request received</div>
        <div className="mt-2 text-white/55 text-sm">We'll reach out within one business day.</div>
      </div>
    );
  }

  const fieldBase = 'w-full rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#3b82f6]/60 transition';

  return (
    <div className="rounded-2xl border border-white/15 bg-[#07070c]/60 backdrop-blur p-6 md:p-7">
      <div className="font-mono text-[10.5px] uppercase tracking-widest text-white/50 mb-5">Book a demo</div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Full name *</label>
            <input type="text" required value={form.name} onChange={set('name')} className={fieldBase} />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Company *</label>
            <input type="text" required value={form.company} onChange={set('company')} className={fieldBase} />
          </div>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Work email *</label>
          <input type="email" required value={form.email} onChange={set('email')} className={fieldBase} />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={set('phone')} className={fieldBase} />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-white/45 mb-1">Message</label>
          <textarea rows={3} value={form.message} onChange={set('message')} className={`${fieldBase} resize-none`} />
        </div>
        {status === 'error' && (
          <p className="text-red-400 text-sm">Something went wrong — email us at sharmaparakh05@gmail.com</p>
        )}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60 px-4 py-2.5 text-[14px] font-semibold text-white transition"
        >
          {status === 'submitting' ? 'Sending…' : 'Request a Demo'}
        </button>
        <p className="text-center font-mono text-[10.5px] text-white/35">
          Or call{' '}
          <a href="tel:+919413552887" className="underline text-white/55">+91 94135-52887</a>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Replace the contact card with DemoRequestForm**

In `Marketing.tsx`, find the `<div className="rounded-2xl border border-white/15 ...">` in the contact section (the one containing the mailto and tel `<a>` links). Replace the entire element with:

```tsx
<DemoRequestForm />
```

- [ ] **Step 5: Verify build**

```bash
cd frontend && npm run build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260523000001_demo_requests.sql frontend/src/pages/Marketing.tsx
git commit -m "feat: replace mailto contact with persistent demo request form"
```

---

## Task 6: Blog Route Setup

**Files:**
- Create: `frontend/src/pages/blog/posts/index.ts`
- Create: `frontend/src/pages/blog/BlogIndex.tsx`
- Create: `frontend/src/pages/blog/BlogPost.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/tailwind.config.ts`

Posts are TypeScript modules exporting Markdown strings — no MDX build plugin, no Vite config changes. `marked` converts Markdown to HTML; `dompurify` sanitizes before `dangerouslySetInnerHTML`.

- [ ] **Step 1: Install dependencies**

```bash
cd frontend && npm install marked dompurify @types/dompurify -D @tailwindcss/typography
```

- [ ] **Step 2: Enable typography plugin in Tailwind**

Open `frontend/tailwind.config.ts`. Add to the plugins array:

```ts
import typography from '@tailwindcss/typography';
// ...
plugins: [typography],
```

If the config uses `require` style:
```js
plugins: [require('@tailwindcss/typography')],
```

- [ ] **Step 3: Create the post registry**

Create `frontend/src/pages/blog/posts/index.ts`:

```ts
export interface BlogPost {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  content: string; // Markdown
}

export const posts: BlogPost[] = [
  {
    slug: 'complete-substation-commissioning-checklist',
    title: 'The Complete Substation Commissioning Checklist (220 kV → 33 kV)',
    date: '2026-05-23',
    description: 'A practical step-by-step checklist covering every phase: pre-commissioning checks, equipment tests, protection relay verification, and energisation sign-off.',
    content: `
## Phase 1: Pre-Commissioning Checks

Before any instrument is connected, verify the civil and installation baseline:

- **Site readiness:** Transformer plinth level, oil containment pit, fire wall clearances per IS 1886.
- **Cable schedule:** Every MV/LV cable traced against the approved single-line diagram.
- **Earthing continuity:** Earth mat resistance < 1 Ω at transformer neutral, switchgear panels, and cable trays (IS 3043).
- **Control room:** Panel labelling, DC supply voltage and polarity, battery bank capacity test.

## Phase 2: Equipment Tests

Run each piece of equipment in isolation before energising interconnected systems.

### Power Transformers
- Insulation resistance — minimum 1 GΩ at 5 kV for > 33 kV class
- Turns ratio (VRT) — within ±0.5% of nameplate
- Vector group confirmation
- Winding resistance (DC) — phase balance within 2%
- Tan delta / power factor — within manufacturer limits
- Oil BDV — minimum 60 kV at 2.5 mm gap per IS 335
- Buchholz relay, PRD, OTI/WTI calibration

### Current Transformers
- Insulation resistance — PI ratio > 1.25
- Polarity check
- Magnetisation curve (knee-point voltage per IEC 61869-2)
- Ratio error and phase displacement

### SF6 Circuit Breakers
- Gas pressure — typically 6.0–6.5 bar at 20°C
- Timing test: close, open, O-C-O cycle per manufacturer spec
- Contact resistance — typically < 100 µΩ for 132 kV class
- Minimum pickup voltage for trip coil (< 70% rated DC)

### Protection Relays
- Settings verified against approved settings schedule
- Trip circuit supervision functional
- End-to-end protection test with simulated fault injection

## Phase 3: Integrated Tests

- Inter-tripping between feeders and transformer HV/LV breakers
- Auto-reclose sequence (if applicable)
- SCADA telemetry — all status points and metered values live in control centre

## Phase 4: Energisation Sequence

1. Energise transformer from HV side only, LV isolated. Observe for 30 min.
2. HV/LV synchronisation check before paralleling.
3. Load pick-up in stages — 25%, 50%, 75%, 100%.
4. Final power quality: voltage unbalance < 2%, THD < 5% at PCC.

---

*Every phase above maps to test templates built into [Optimus Testing](/).*
    `.trim(),
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug);
}
```

- [ ] **Step 4: Create BlogIndex page**

Create `frontend/src/pages/blog/BlogIndex.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { posts } from './posts';
import { formatDate } from '@/lib/format';

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#07070c] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[#60a5fa] text-sm font-mono hover:underline">← optimustesting.com</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Resources</h1>
        <p className="mt-3 text-white/55 text-lg">Commissioning guides, test procedures, and industry insights.</p>
        <div className="mt-10 space-y-4">
          {posts.map(post => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block rounded-2xl border border-white/10 hover:border-white/25 bg-white/[.02] hover:bg-white/[.04] p-6 transition"
            >
              <div className="font-mono text-[11px] text-white/40 uppercase tracking-widest mb-2">
                {formatDate(post.date)}
              </div>
              <h2 className="text-xl font-semibold text-white leading-snug">{post.title}</h2>
              <p className="mt-2 text-white/55 text-sm leading-relaxed">{post.description}</p>
              <div className="mt-4 text-[#60a5fa] text-sm font-mono">Read →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create BlogPost page**

Create `frontend/src/pages/blog/BlogPost.tsx`:

```tsx
import { useParams, Link, Navigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import { getPost } from './posts';
import { formatDate } from '@/lib/format';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPost(slug) : undefined;

  const safeHtml = useMemo(() => {
    if (!post) return '';
    const raw = marked(post.content) as string;
    return DOMPurify.sanitize(raw);
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-[#07070c] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link to="/blog" className="text-[#60a5fa] text-sm font-mono hover:underline">← All resources</Link>
        <div className="mt-8 font-mono text-[11px] text-white/40 uppercase tracking-widest">
          {formatDate(post.date)}
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight leading-tight">{post.title}</h1>
        <div
          className="mt-10 prose prose-invert prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
        <div className="mt-16 rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 p-6">
          <div className="font-semibold text-white text-lg">Stop doing this in Excel.</div>
          <p className="mt-2 text-white/60 text-sm">
            TestFlow has 46 ready-to-use test templates, a mobile app for field engineers,
            and AI-generated handover reports.
          </p>
          <Link
            to="/#contact"
            className="mt-4 inline-block rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            Book a demo →
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add routes in App.tsx**

Open `frontend/src/App.tsx`. Add imports near the other page imports:

```tsx
import BlogIndex from '@/pages/blog/BlogIndex';
import BlogPost from '@/pages/blog/BlogPost';
```

Inside the `<Routes>` block, add before the catch-all `<Route path="*" ...>`:

```tsx
<Route path="/blog" element={<BlogIndex />} />
<Route path="/blog/:slug" element={<BlogPost />} />
```

- [ ] **Step 7: Verify build**

```bash
cd frontend && npm run build
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/blog/ frontend/src/App.tsx frontend/package.json frontend/package-lock.json frontend/tailwind.config.ts
git commit -m "feat: add /blog route with markdown renderer and first commissioning checklist post"
```

---

## Self-Review

**Spec coverage:**
- [x] Fix TypeScript errors → Task 1
- [x] og-image + logo → Task 2
- [x] Sentry wiring → Task 3
- [x] Feature gates (AI reports + audit log) → Task 4
- [x] Demo request form with Supabase backend → Task 5
- [x] Blog route `/blog/[slug]` + first post → Task 6
- [x] Audit log viewer → already exists; gate added in Task 4

**Placeholder scan:** No TBDs, no "implement later". All code blocks are complete and runnable.

**Type consistency:**
- `BlogPost` interface defined in `posts/index.ts`, consumed in `BlogIndex.tsx` and `BlogPost.tsx` — consistent.
- `FeatureFlag` union in `features.ts` already contains `'ai_reports'` and `'audit_log_viewer'` — no new types needed.
- `DemoRequestForm` uses `supabase` (already imported from `@/integrations/supabase/client` in `Marketing.tsx`) and `useState` (already in React import) — verify both exist before adding.

**Security:** `dangerouslySetInnerHTML` in `BlogPost.tsx` is guarded by `DOMPurify.sanitize` before use. Post content is static strings in source code, not user input — double protection.

**External dependencies reminder:**
- Task 1: needs `supabase gen types` CLI command first
- Task 3: needs Sentry DSN in `frontend/.env`
- Task 5 Step 2: needs `supabase db push` with linked project
