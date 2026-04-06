# AI Report Generation — Implementation Plan

## Overview

When a project is closed, the GM can generate a professional commissioning report using Claude AI. The report summarises test results, flags failures, and provides engineering recommendations — replacing manually written Word documents.

---

## Architecture

```
Browser (GM clicks "Generate AI Report")
  │
  ▼
Supabase Edge Function: generate-report
  │  - Fetches all project data (server-side, secure)
  │  - Builds structured prompt
  │  - Calls Anthropic API
  │  - Returns report text
  │
  ▼
Frontend displays report in a modal / exports as PDF
```

**Why a Supabase Edge Function?**
- `ANTHROPIC_API_KEY` stays server-side — never exposed in the browser bundle
- Runs close to the database (same Supabase region) — fast data fetching
- No separate backend to maintain
- Already in the stack — no new infrastructure

---

## What's Already Built

### Edge Function
`supabase/functions/generate-report/index.ts`

**Input:** `POST { project_id: string }`

**What it fetches:**
- Project details (number, site, client, dates, status)
- Equipment scope (types and quantities)
- All equipment instances and their statuses
- All test tasks with results, pass/fail, and remarks

**Prompt structure sent to Claude:**
1. Project details block
2. Equipment scope table
3. Test summary (total / approved / failed / pending counts)
4. List of failed/flagged tests with remarks
5. Instructions for a formal 5-section report

**Model used:** `claude-haiku-4-5-20251001` (fast, cost-effective for structured output)
Upgrade to `claude-sonnet-4-6` for higher quality if needed.

**Output:** `{ report: string }` — Markdown-formatted report text

---

## Frontend Integration (To Build)

### Step 1 — Add "Generate AI Report" button to ProjectDetail

In `src/pages/projects/ProjectDetail.tsx`, add a button visible when `project.status === 'CLOSED'`:

```tsx
import { Sparkles } from 'lucide-react';

// In the header actions:
{project.status === 'CLOSED' && (
  <Button onClick={() => setShowAIReport(true)} variant="outline">
    <Sparkles className="h-4 w-4 mr-2" />
    Generate AI Report
  </Button>
)}
```

### Step 2 — Create AIReportDialog component

`src/components/AIReportDialog.tsx`

```tsx
// Pseudocode — implement fully
export function AIReportDialog({ projectId, open, onOpenChange }) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('generate-report', {
      body: { project_id: projectId },
    });
    if (!error) setReport(data.report);
    setLoading(false);
  };

  // Display report in a scrollable Dialog
  // Offer "Copy to clipboard" and "Print" actions
}
```

### Step 3 — Set the Anthropic API key as a Supabase secret

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

This stores the key server-side. It is **never** in `.env` or the browser bundle.

---

## Environment Variables Required

| Variable | Where | How to get |
|---|---|---|
| `ANTHROPIC_API_KEY` | Supabase secret (server-side only) | console.anthropic.com → API Keys |

Set it via CLI:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
```

Or via Supabase Dashboard → Edge Functions → Secrets.

**Do not** add `ANTHROPIC_API_KEY` to `.env` or prefix it with `VITE_` — that would expose it in the browser.

---

## Report Sections (Claude Output)

The prompt instructs Claude to produce a 5-section formal report:

1. **Executive Summary** — 2–3 paragraphs covering overall project outcome
2. **Scope of Work** — Equipment types and quantities tested
3. **Test Results Summary** — Completion rate, pass/fail breakdown, notable patterns
4. **Issues Found** — Failed tests with recommended corrective actions
5. **Conclusion** — Overall sign-off recommendation (ready / not ready for energisation)

---

## Cost Estimate

| Model | Tokens per report (est.) | Cost per report |
|---|---|---|
| claude-haiku-4-5 | ~3,000 in / ~1,500 out | ~$0.003 |
| claude-sonnet-4-6 | ~3,000 in / ~1,500 out | ~$0.05 |

For typical usage (a few reports per month), cost is negligible.

---

## Future Enhancements

- **PDF generation**: After displaying the report, pass it to `@react-pdf/renderer` to produce a downloadable PDF with TestFlow branding
- **Report versioning**: Save generated reports to a `project_reports` table so they can be retrieved without regenerating
- **Custom prompts**: Let GMs add project-specific context or notes before generating
- **Multi-language**: Support report generation in the client's local language via a language selector
- **Streaming**: Use Anthropic streaming API to show report text as it generates, reducing perceived latency

---

## Implementation Checklist

- [x] Edge function created: `supabase/functions/generate-report/index.ts`
- [x] GitHub Actions auto-deploys edge function on push to main
- [ ] Set `ANTHROPIC_API_KEY` as Supabase secret (manual, one-time)
- [ ] Build `AIReportDialog` component
- [ ] Wire "Generate AI Report" button in `ProjectDetail.tsx`
- [ ] Add report copy/print actions
- [ ] (Optional) Save reports to `project_reports` table
- [ ] (Optional) PDF export of generated report
