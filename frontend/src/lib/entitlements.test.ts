import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEntitlements } from './entitlements';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({
      data: {
        plan_slug: 'starter',
        plan_name: 'Starter',
        max_users: 10,
        max_active_projects: 3,
        is_custom: false,
        features: { offline_mobile: true, api_access: false },
      },
      error: null,
    }),
  },
}));
vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({ company: { id: 'company-1' } }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useEntitlements', () => {
  it('parses the RPC response into camelCase entitlements', async () => {
    const { result } = renderHook(() => useEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entitlements?.planSlug).toBe('starter');
    expect(result.current.entitlements?.maxActiveProjects).toBe(3);
    expect(result.current.entitlements?.features.offline_mobile).toBe(true);
  });
});
