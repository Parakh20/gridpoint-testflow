# Email Rate Limit — Problem Analysis & Solutions

## What's Happening

Supabase's built-in shared SMTP has a hard rate limit of **2–4 emails per hour** on the free plan, and even on paid plans the shared sender has low throughput. This limit covers all transactional emails: signup confirmation, magic links, password resets, and email change confirmations.

For an internal app with multiple engineers onboarding or resetting passwords simultaneously, this limit is hit quickly.

---

## Solutions (Ranked by Effort + Cost)

### Option A — Disable Email Confirmation *(Zero cost, 30 minutes)*

Since TestFlow is **internal-only** (no public signup), email confirmation is mostly security theater. Admins create accounts manually or via invite. Disabling confirmation removes the rate limit problem for signup entirely.

**How:**
1. Supabase Dashboard → Authentication → Settings
2. Toggle off **"Enable email confirmations"**
3. Password reset emails still work — but they're rare (admins can reset via dashboard)

**Pros:** Instant fix, zero cost, reduces friction for new engineers onboarding  
**Cons:** No email-verified identity (acceptable for internal tool)  
**Rate limit after:** Not a problem — no signup emails sent

---

### Option B — Add OAuth (Google / Microsoft) *(Zero cost, 2–4 hours)*

Replace or supplement email/password login with OAuth. Users log in with their Google or Microsoft work accounts. No emails sent by Supabase at all for auth.

**How (Google OAuth):**
1. Google Cloud Console → Create OAuth 2.0 credentials
2. Supabase Dashboard → Authentication → Providers → Google → paste Client ID + Secret
3. Frontend: add `supabase.auth.signInWithOAuth({ provider: 'google' })`

**Pros:** No emails, no rate limits, SSO with work accounts, better UX  
**Cons:** Users need Google/Microsoft accounts; requires OAuth app setup  
**Rate limit after:** Completely eliminated for OAuth users

---

### Option C — Custom SMTP Provider *(Low cost, 1–2 hours setup)*

Point Supabase at a dedicated email delivery service instead of the shared sender. All transactional emails (confirmation, reset) go through your provider with much higher limits.

**How:**
Supabase Dashboard → Project Settings → Auth → SMTP Settings → enable custom SMTP → enter provider credentials

See [Provider Comparison](#smtp-provider-comparison--pricing) below.

**Pros:** Keeps email/password flow, high deliverability, full control  
**Cons:** Small ongoing cost; requires domain verification  
**Rate limit after:** Effectively none for internal team scale

---

### Option D — Supabase Pro Plan *($25/month)*

Upgrading to Supabase Pro increases email quota significantly and unlocks custom SMTP (though you still configure an external provider for best results). Useful if you also need Pro for other features (higher DB size, more storage, no pause on inactivity).

**Rate limit after:** Higher built-in quota, but custom SMTP still recommended

---

## SMTP Provider Comparison & Pricing

| Provider | Free Tier | Paid (starter) | Per-email at scale | Setup Difficulty | Best For |
|---|---|---|---|---|---|
| **Resend** | 3,000/month · 100/day | $20/month → 50k/month | $0.40/1k | Very easy | Developers; best DX |
| **Brevo** (Sendinblue) | 9,000/month · 300/day | $9/month → 20k/month | $0.45/1k | Easy | Budget-first |
| **AWS SES** | 3,000/month (if EC2) | Pay-as-you-go | $0.10/1k | Medium (DNS + IAM) | Cheapest at scale |
| **Postmark** | 100 test emails | $15/month → 10k/month | $1.50/1k | Easy | Transactional reliability |
| **SendGrid** | 100/day (~3k/month) | $19.95/month → 50k/month | $0.40/1k | Medium | Established option |
| **Mailgun** | 100/day (3 months only) | $35/month → 50k/month | $0.70/1k | Medium | EU compliance |

### Monthly Cost Estimate for TestFlow

Assuming ~30 users total, with realistic email events:
- New user invites: ~5/month
- Password resets: ~10/month
- Email changes: ~2/month
- **Total: ~20–50 emails/month**

| Solution | Monthly Cost |
|---|---|
| Resend free tier | **$0** (3,000/month free — 60× your usage) |
| Brevo free tier | **$0** (9,000/month free — 180× your usage) |
| AWS SES | **$0.002** (literally fractions of a cent) |
| Postmark | **$15** (overkill for this volume) |
| Supabase Pro (for quota only) | **$25** (not recommended just for email) |

**Verdict for TestFlow scale:** Resend or Brevo free tiers comfortably cover the entire team forever. AWS SES is the cheapest if you're ever on AWS already.

---

## OAuth Provider Comparison

| Provider | Cost | Setup Time | Works If Users Have |
|---|---|---|---|
| **Google OAuth** | Free | ~1 hour | Google / Gmail / Workspace accounts |
| **Microsoft (Azure AD)** | Free | ~2 hours | Microsoft 365 / Outlook accounts |
| **GitHub OAuth** | Free | ~30 minutes | GitHub accounts |

For a field engineering team, **Google OAuth** is the most practical — most engineers and GMs have Google accounts, and it eliminates all email dependency.

---

## Recommended Action Plan

### Immediate (today, fixes the problem now)
1. **Disable email confirmation** in Supabase Auth settings — no more rate limit errors on signup

### Short-term (this week)
2. **Configure Resend as custom SMTP** — free, takes 1 hour, covers password resets with no limits
   - Sign up at resend.com, verify your domain, grab SMTP credentials, paste into Supabase

### ✅ Done — Google OAuth implemented
3. **Google OAuth** — `signInWithGoogle()` added to `AuthContext`; "Continue with Google" button added to both Sign In and Sign Up tabs in `Auth.tsx`
   - Supabase Dashboard → Auth → Providers → Google → paste Client ID + Secret to activate
   - New OAuth users land on `Index.tsx` with a "role being configured" message until SUPERADMIN assigns a role

---

## Resend Setup (Step-by-Step)

The fastest paid-tier-free fix:

```
1. Sign up → resend.com
2. Add domain → verify DNS (TXT + MX records)
3. Create API key
4. In Supabase Dashboard → Project Settings → Auth → SMTP:
   - Host:     smtp.resend.com
   - Port:     465
   - Username: resend
   - Password: <your API key>
   - Sender:   noreply@yourdomain.com
5. Save → test with a password reset email
```

---

## ✅ Google OAuth — Implementation Complete

Frontend code is already implemented. Only the Supabase Dashboard + Google Cloud Console steps remain.

### Step 1 — Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select or create a project (e.g. `testflow-prod`)
3. Left sidebar → **APIs & Services → OAuth consent screen**
   - User type: **Internal** (company/Workspace accounts only) or **External** (any Google account)
   - App name: `TestFlow`
   - User support email: your email
   - Authorized domain: `supabase.co`
   - Save and continue (skip Scopes, skip Test users for Internal)
4. Left sidebar → **APIs & Services → Credentials**
   - Click **+ Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `TestFlow Web`
   - Under **Authorized redirect URIs** → click **+ Add URI**:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
     Replace `<your-project-ref>` with your Supabase project ID (e.g. `srlsypemgnkpoamhmbrf`)
   - Click **Create**
5. Copy the **Client ID** and **Client Secret** from the popup

### Step 2 — Supabase Dashboard

1. Go to your Supabase project → **Authentication → Providers**
2. Find **Google** → click to expand
3. Toggle **Enable Sign in with Google** → ON
4. Paste **Client ID** and **Client Secret** from Step 1
5. Click **Save**

### Step 3 — Verify Redirect URL (for local dev)

If testing locally, also add this URI in Google Cloud Console → Credentials → your OAuth client:
```
http://localhost:8080
```
Supabase handles the `/auth/v1/callback` internally — your app just needs the origin to be whitelisted.

### Step 4 — Test It

1. Open the app → Auth page → click **"Continue with Google"**
2. Google consent screen appears → sign in
3. Redirected back to the app
4. If the Google account has no role yet → lands on "role being configured" page (expected — SUPERADMIN assigns role)
5. Once role is assigned → next sign-in goes straight to the correct dashboard

---

## Files Updated After Implementation

- ✅ `frontend/src/contexts/AuthContext.tsx` — `signInWithGoogle()` added
- ✅ `frontend/src/pages/Auth.tsx` — "Continue with Google" button on both tabs
- ✅ `CLAUDE.md` — Auth section updated with OAuth flow notes
