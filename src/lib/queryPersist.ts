import type { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

/** Only public, non-personal catalog data is cached on the device. */
const CACHEABLE_PREFIXES = ["categories", "category", "services", "addons"];

export function setupCatalogPersistence(queryClient: QueryClient) {
  if (typeof window === "undefined") return;
  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "spotless-catalog-cache",
      throttleTime: 1000,
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60_000,
      buster: "v1",
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          const first = query.queryKey[0];
          return (
            query.state.status === "success" &&
            typeof first === "string" &&
            CACHEABLE_PREFIXES.includes(first)
          );
        },
      },
    });
  } catch {
    /* storage can be unavailable (private mode) — the app still works */
  }
}
