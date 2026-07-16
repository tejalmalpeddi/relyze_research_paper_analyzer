// app/mindmap/page.tsx
//
// Shown at "/mindmap". There are two ways to land here, and this page
// has to handle both:
//
//   1. With a "?id=" query parameter -- this is where the "redirect"
//      button on a PreviousPapers card (see PaperCard's
//      handleRedirectButtonClick in components/History.tsx) sends the
//      user, telling this page exactly WHICH paper to show.
//   2. With no query parameter at all -- this is what happens when
//      someone clicks the plain "Mind Map" tab in the navbar. In that
//      case, there's no specific paper requested, so this page instead
//      defaults to showing whichever paper was saved MOST RECENTLY, so
//      the tab always shows something useful instead of an empty
//      placeholder.
//
// There is no backend route like "GET /history/{id}" yet -- only
// "GET /history" (everything) and "GET /history/search?title=" (by exact
// title) exist. Rather than adding a new backend endpoint for this, this
// page just fetches the WHOLE list (the same fetchHistoryList() the
// homepage uses) and does the "which one do I actually show" decision
// right here in the browser. For the number of papers a project like this
// will realistically have, that's simple and fast enough -- if this ever
// needed to scale to thousands of saved papers, THEN it would be worth
// asking the backend for one specific row instead.

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { fetchHistoryList } from "@/lib/api";
import { HistoryEntry } from "@/lib/types";

// React Flow (used inside MindMapView) touches window/document, which
// don't exist during Next.js's server-side render -- loading it with
// ssr:false means it only ever renders in the browser, avoiding a crash.
const MindMapView = dynamic(
  () => import("@/components/MindMap").then((module) => ({ default: module.MindMapView })),
  { ssr: false }
);

// Given every saved paper, find the one with the most recent created_at
// timestamp. Returns null if the list is empty (nothing has been saved
// yet at all). Written as a plain loop that keeps track of "the best one
// seen so far," rather than a one-line sort-and-grab-first -- easier to
// step through and see exactly how the comparison works.
function findMostRecentlyCreatedEntry(entries: HistoryEntry[]): HistoryEntry | null {
  let mostRecentEntrySoFar: HistoryEntry | null = null;

  for (const entry of entries) {
    if (mostRecentEntrySoFar === null) {
      // First entry we've looked at -- it's automatically the "most
      // recent so far" purely because nothing else has been compared yet.
      mostRecentEntrySoFar = entry;
    } else {
      const thisEntryTime = new Date(entry.created_at).getTime();
      const bestSoFarTime = new Date(mostRecentEntrySoFar.created_at).getTime();
      if (thisEntryTime > bestSoFarTime) {
        mostRecentEntrySoFar = entry;
      }
    }
  }

  return mostRecentEntrySoFar;
}

export default function MindMapPage() {
  // useSearchParams() reads whatever comes after the "?" in the current
  // URL. For a URL like "/mindmap?id=42", searchParams.get("id") gives
  // back the string "42". For a plain "/mindmap" with no "?" at all, it
  // gives back null.
  const searchParams = useSearchParams();
  const requestedIdText = searchParams.get("id");

  const [allEntries, setAllEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchHistoryList()
      .then((fetchedEntries) => {
        setAllEntries(fetchedEntries);
        setLoadErrorMessage(null);
      })
      .catch((error) => {
        if (error instanceof Error) {
          setLoadErrorMessage(error.message);
        } else {
          setLoadErrorMessage("Something went wrong while loading papers.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Figure out, step by step, which single entry (if any) should be
  // shown. Two completely different rules depending on how this page was
  // reached -- spelled out as its own if/else rather than folded into one
  // dense expression, so each rule is easy to read and change on its own.
  let matchedEntry: HistoryEntry | null = null;
  if (requestedIdText !== null) {
    // Reached via a specific paper's "redirect" button -- find the exact
    // matching id.
    const requestedIdNumber = Number(requestedIdText);
    for (const entry of allEntries) {
      if (entry.id === requestedIdNumber) {
        matchedEntry = entry;
      }
    }
  } else {
    // Reached via the plain "Mind Map" navbar tab, with no specific
    // paper requested -- default to whichever paper was saved most
    // recently.
    matchedEntry = findMostRecentlyCreatedEntry(allEntries);
  }

  // Now decide what message to show if there's nothing to render yet --
  // the wording is different depending on whether a specific id was
  // requested (and just didn't match anything) versus no id being
  // requested at all (meaning there are simply no papers saved yet).
  let notFoundMessage: string;
  if (requestedIdText !== null) {
    notFoundMessage = `No saved paper found with id "${requestedIdText}".`;
  } else {
    notFoundMessage = "No papers saved yet -- upload one from the homepage to get started.";
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />

      <div className="flex-1 bg-[#17181a]">
        {isLoading === true && (
          <div className="flex h-full items-center justify-center font-serif text-stone-400">
            Loading...
          </div>
        )}

        {isLoading === false && loadErrorMessage !== null && (
          <div className="flex h-full items-center justify-center font-serif text-[#c1666b]">
            Couldn&apos;t load your papers: {loadErrorMessage}
          </div>
        )}

        {isLoading === false && loadErrorMessage === null && matchedEntry === null && (
          <div className="flex h-full items-center justify-center font-serif text-stone-400">
            {notFoundMessage}
          </div>
        )}

        {matchedEntry !== null && <MindMapView entry={matchedEntry} />}
      </div>
    </div>
  );
}
