import { QueryClient } from "@tanstack/react-query";

// Create a client with optimized cache settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnMount: "always",
      // Structure error responses consistently
      meta: {
        errorMessage: "Failed to fetch data",
      },
    },
    mutations: {
      retry: 1,
      // Pessimistic updates by default
      meta: {
        optimistic: false,
      },
    },
  },
});
