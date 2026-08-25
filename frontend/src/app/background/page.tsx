"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useHistoryEntry } from "@/lib/useHistoryEntry";
import { useDocumentScrollLock } from "@/lib/useDocumentScrollLock";
import { KeywordsFolder } from "@/components/background/KeywordsFolder";
import type { DifficultyLevel } from "@/components/map/MindMap";

const MindMapView = dynamic(
  () => import("@/components/map/MindMap").then((module) => ({ default: module.MindMapView })),
  { ssr: false }
);

const MIN_FOLDER_PANEL_PERCENT = 20;
const MAX_FOLDER_PANEL_PERCENT = 70;
const DEFAULT_FOLDER_PANEL_PERCENT = 45;

export default function BackgroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#17181a] font-serif text-stone-400">
          Loading...
        </div>
      }
    >
      <BackgroundPageContent />
    </Suspense>
  );
}

function BackgroundPageContent() {
  const { isLoading, matchedEntry, loadErrorMessage, notFoundMessage } = useHistoryEntry();
  useDocumentScrollLock();

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [folderPanelPercent, setFolderPanelPercent] = useState(DEFAULT_FOLDER_PANEL_PERCENT);
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>("beginner");

  const handleDividerMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (isDraggingRef.current === false || containerRef.current === null) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const pixelsFromRightEdge = containerRect.right - event.clientX;
      const percentFromRightEdge = (pixelsFromRightEdge / containerRect.width) * 100;
      const clampedPercent = Math.min(
        MAX_FOLDER_PANEL_PERCENT,
        Math.max(MIN_FOLDER_PANEL_PERCENT, percentFromRightEdge)
      );
      setFolderPanelPercent(clampedPercent);
    }

    function handleMouseUp() {
      if (isDraggingRef.current === true) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex h-screen">
      <div className="min-w-0 flex-1 bg-[#17181a]">
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

      {matchedEntry !== null && (
        <>
          <DragDivider onMouseDown={handleDividerMouseDown} />
          <div
            className="flex shrink-0 items-end justify-center bg-cover bg-center px-8 pt-8 pb-0 shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            style={{ width: `${folderPanelPercent}%`, backgroundImage: "url(/background/wood.png)" }}
          >
            <KeywordsFolder entry={matchedEntry} difficultyLevel={selectedLevel} />
          </div>
        </>
      )}
    </div>
  );
}

function DragDivider({ onMouseDown }: { onMouseDown: (event: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      className="group flex w-[26px] shrink-0 cursor-col-resize items-center justify-center bg-[#17181a]"
    >
      <div className="relative flex h-full items-center justify-center">
        <div className="h-full w-1 rounded-full bg-[#c6ac8f]/70 transition-colors group-hover:bg-[#c6ac8f]" />
        <div className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-[#5e503f]">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
            <circle cx="2" cy="2" r="1.3" fill="#D9D9D9" />
            <circle cx="8" cy="2" r="1.3" fill="#D9D9D9" />
            <circle cx="2" cy="7" r="1.3" fill="#D9D9D9" />
            <circle cx="8" cy="7" r="1.3" fill="#D9D9D9" />
            <circle cx="2" cy="12" r="1.3" fill="#D9D9D9" />
            <circle cx="8" cy="12" r="1.3" fill="#D9D9D9" />
          </svg>
        </div>
      </div>
    </div>
  );
}
