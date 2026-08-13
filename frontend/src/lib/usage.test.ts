import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUsage } from './usage';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({
      data: { active_users: 7, active_projects: 2, ai_reports_this_month: 3 },
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

describe('useUsage', () => {
  it('parses the RPC response into camelCase usage', async () => {
    const { result } = renderHook(() => useUsage(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.usage?.activeUsers).toBe(7);
    expect(result.current.usage?.aiReportsThisMonth).toBe(3);
  });
});
