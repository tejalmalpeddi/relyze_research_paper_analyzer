// lib/useHistoryEntry.ts
//
// Loads the one paper a page should show: a specific one via "?id=" in the
// URL (set by a PreviousPapers card's redirect button), or the most
// recently saved paper when there's no id at all (e.g. landing here from a
// plain nav tab with no paper picked yet). Shared by every page that needs
// "the current paper" -- originally lived inline in app/mindmap/page.tsx,
// extracted here once app/background/page.tsx needed the exact same
// lookup.

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchHistoryById, fetchLatestHistory } from "@/lib/api";
import { HistoryEntry } from "@/lib/types";

interface HistoryEntryLoadState {
  requestKey: string | null | undefined;
  matchedEntry: HistoryEntry | null;
  loadErrorMessage: string | null;
}

export function useHistoryEntry() {
  const searchParams = useSearchParams();
  const requestedIdText = searchParams.get("id");

  const [loadState, setLoadState] = useState<HistoryEntryLoadState>({
    requestKey: undefined,
    matchedEntry: null,
    loadErrorMessage: null,
  });

  // Starts out true because requestKey (undefined) never equals a real
  // requestedIdText (string | null) on the very first render.
  const isLoading = loadState.requestKey !== requestedIdText;

  useEffect(() => {
    let isCurrentRequest = true;

    const request =
      requestedIdText !== null ? fetchHistoryById(requestedIdText) : fetchLatestHistory();

    request
      .then((fetchedEntry) => {
        if (isCurrentRequest === true) {
          setLoadState({ requestKey: requestedIdText, matchedEntry: fetchedEntry, loadErrorMessage: null });
        }
      })
      .catch(() => {
        if (isCurrentRequest === true) {
          setLoadState({ requestKey: requestedIdText, matchedEntry: null, loadErrorMessage: null });
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [requestedIdText]);

  const notFoundMessage =
    requestedIdText !== null
      ? `No saved paper found with id "${requestedIdText}".`
      : "No papers saved yet -- upload one from the homepage to get started.";

  return {
    isLoading,
    matchedEntry: loadState.matchedEntry,
    loadErrorMessage: loadState.loadErrorMessage,
    notFoundMessage,
  };
}
