// components/home/previouspapers.tsx
//
// The piece the homepage actually imports. This now owns the real data:
// it fetches the saved-paper list itself on mount (same pattern as your
// teammate's PreviousPapersSection in History.tsx), tracks which filter
// tags are currently checked, and derives both the available tag list
// and the visible (filtered) entries from that. Your layout, spacing,
// and scroll behavior (useScrollJack) are untouched -- the only thing
// that changed inside the returned JSX is what's inside the <ul>.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PaperPreview from "@/components/home/paperpreview";
import Filters from "@/components/home/filters";
import useScrollJack from "@/components/home/scrolljack";
import { HistoryEntry } from "@/lib/types";
import { fetchHistoryList, ApiError } from "@/lib/api";
import {useAuth} from "@/app/auth/auth-query"

export default function PreviousPapers() {
  const listRef = useScrollJack();
  const router = useRouter();

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  // True specifically when the backend said "you're not logged in" (a 401
  // from GET /history). Kept separate from loadErrorMessage so the UI can
  // show a friendly "please log in" prompt instead of a scary error.
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [selectedFilterTags, setSelectedFilterTags] = useState<Set<string>>(new Set());
  const {isAuthenticated} = useAuth();

  useEffect(() => {
    fetchHistoryList()
      .then((fetchedEntries) => {
        setEntries(fetchedEntries);
        setLoadErrorMessage(null);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
        } else if (error instanceof Error) {
          setLoadErrorMessage(error.message);
        } else {
          setLoadErrorMessage("Something went wrong while loading your papers.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Called by a PaperPreview after it successfully deletes itself on the
  // backend -- removes that same entry from THIS list, so the grid
  // updates immediately without needing to re-fetch everything.
  function handlePaperDeleted(deletedId: string) {
    setEntries((previousEntries) =>
      previousEntries.filter((entry) => entry.id !== deletedId)
    );
  }

  function handleToggleFilterTag(tag: string) {
    setSelectedFilterTags((previousSelectedTags) => {
      const nextSelectedTags = new Set(previousSelectedTags);
      if (nextSelectedTags.has(tag) === true) {
        nextSelectedTags.delete(tag);
      } else {
        nextSelectedTags.add(tag);
      }
      return nextSelectedTags;
    });
  }

  // Every unique filter tag across every currently-loaded paper, used to
  // build the Filters panel's checkbox list.
  const availableFilterTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const entry of entries) {
      for (const tag of entry.filters) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [entries]);

  // The entries actually shown in the grid -- if no filter tags are
  // checked, show everything; otherwise, only show papers that have at
  // least one of the checked tags.
  const visibleEntries = useMemo(() => {
    if (selectedFilterTags.size === 0) {
      return entries;
    }
    return entries.filter((entry) =>
      entry.filters.some((tag) => selectedFilterTags.has(tag))
    );
  }, [entries, selectedFilterTags]);

  return (
    <section className="h-[80vh] p-15 pt-0">
      <header className="flex justify-between">
        <h2 className="text-white pt-[2rem]">Previous Papers</h2>
        <Filters
          availableFilterTags={availableFilterTags}
          selectedFilterTags={selectedFilterTags}
          onToggleFilterTag={handleToggleFilterTag}
        />
      </header>

      {isLoading === true && (
        <p className="font-serif text-stone-300 mt-4">Loading your papers...</p>
      )}

      {isLoading === false && isAuthenticated === true && loadErrorMessage !== null && (
        <p className="font-serif text-[#c1666b] mt-4">
          Couldn&apos;t load your papers: {loadErrorMessage}
        </p>
      )}

      {isLoading === false &&
        loadErrorMessage === null &&
        (isAuthenticated === false || visibleEntries.length === 0) && (
          <div className="flex w-full flex-col items-center gap-4 py-10 text-center">
            <p className="font-serif text-stone-300">
              You are currently logged out, nothing to display!
            </p>
            <button
              type="button"
              onClick={() => router.push("/auth")}
              className="rounded-sm bg-[#5b4636] px-6 py-2 font-serif font-semibold text-white"
            >
              Sign In
            </button>
          </div>
        )}

      <ul
        ref={listRef}
        className="h-[80%] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 overflow-hidden mt-4 mb-50 scrollbar-hidden"
      >
        {isLoading === false &&
          isAuthenticated === true &&
          loadErrorMessage === null &&
          visibleEntries.map((entry) => (
            <li key={entry.id}>
              <PaperPreview entry={entry} onDeleted={handlePaperDeleted} />
            </li>
          ))}
      </ul>
    </section>
  );
}
