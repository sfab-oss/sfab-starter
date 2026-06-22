"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const registryQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

export function RegistryQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={registryQueryClient}>
      {children}
    </QueryClientProvider>
  );
}
