import { QueryClient } from "@tanstack/react-query";

/**
 * Application-wide React Query client.
 *
 * Kept in its own module so non-React services (e.g. the auth store) can
 * invalidate the cache when the active account changes without creating
 * an import cycle with the bootstrap entrypoint.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
