// app/mindmap/page.tsx


"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useHistoryEntry } from "@/lib/useHistoryEntry";
import { useDocumentScrollLock } from "@/lib/useDocumentScrollLock";
import { parseDifficultyLevel, type DifficultyLevel } from "@/components/map/MindMap";


const MindMapView = dynamic(
  () => import("@/components/map/MindMap").then((module) => ({ default: module.MindMapView })),
  { ssr: false }
);

export default function MindMapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#17181a] font-serif text-stone-400">
          Loading...
        </div>
      }
    >
      <MindMapPageContent />
    </Suspense>
  );
}

function MindMapPageContent() {
  const { isLoading, matchedEntry, loadErrorMessage, notFoundMessage } = useHistoryEntry();
  useDocumentScrollLock();

  // Seeded once from "?difficulty=" (set by the Upload Successful popup's
  // Beginner/Intermediate/Advanced picker) so landing here respects that
  // choice instead of always starting at Beginner -- kept in local state
  // rather than read fresh every render so the in-map difficulty toggle
  // can still change it afterwards.
  const searchParams = useSearchParams();
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>(() =>
    parseDifficultyLevel(searchParams.get("difficulty"))
  );

  return (
    <div className="flex h-screen flex-col">
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

        {matchedEntry !== null && (
          <MindMapView
            entry={matchedEntry}
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
          />
        )}
      </div>
    </div>
  );
}
