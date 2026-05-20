import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

export const qk = {
  projects: (userId: string) => ['projects', userId] as const,
  tasks: (userId: string, projectId: string) => ['tasks', userId, projectId] as const,
  testTemplate: (templateId: string) => ['template', templateId] as const,
  testRecord: (taskId: string) => ['record', taskId] as const,
};
