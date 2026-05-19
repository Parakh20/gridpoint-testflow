// Golden-path E2E: log in → see the dashboard.
//
// Designed as a smoke test — one quick happy path that catches the most
// common regressions (auth flow, RLS misconfig, build broken, etc.).
//
// Expand with: project creation, scope save, equipment generation,
// test submit/approve flows.

import { test, expect } from '@playwright/test';

const email = process.env.E2E_SUPERADMIN_EMAIL;
const password = process.env.E2E_SUPERADMIN_PASSWORD;

test.skip(!email || !password, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD not set');

test('superadmin can sign in and reach the user management table', async ({ page }) => {
  await page.goto('/auth');

  // Sign in form should be visible
  await expect(page.getByRole('heading', { name: /sign in|welcome/i })).toBeVisible({ timeout: 10_000 });

  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // After login, dashboard should load. Tolerate role-based routing.
  await expect(page).toHaveURL(/\/(superadmin|gm|supervisor|engineer)/, { timeout: 15_000 });

  // For SUPERADMIN: user management table should be present
  await expect(page.getByText(/user management/i).first()).toBeVisible({ timeout: 10_000 });
});

test('health endpoint responds', async ({ request }) => {
  // If E2E_BASE_URL points at a deployed env, we can hit the public health probe
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
  // Skip locally — no Supabase Edge Functions on dev server
  test.skip(baseUrl.includes('localhost'), 'Health endpoint check only meaningful in deployed env');

  // Health endpoint sits behind Supabase Functions URL, not the app's URL.
  // Caller can set SUPABASE_FUNCTIONS_URL=https://<ref>.supabase.co/functions/v1
  const functionsUrl = process.env.SUPABASE_FUNCTIONS_URL;
  test.skip(!functionsUrl, 'SUPABASE_FUNCTIONS_URL not set');

  const res = await request.get(`${functionsUrl}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
});
