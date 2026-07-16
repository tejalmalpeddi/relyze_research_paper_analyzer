// app/page.tsx
//
// The actual homepage -- shown at "/". Three pieces, stacked vertically:
//   1. Navbar (components/Navbar.tsx) -- shared with the Mind Map page.
//   2. The "hero" area -- the wood-desk background, the "Visualize your
//      research, your way" card, and the leather upload tray.
//   3. PreviousPapersSection (components/History.tsx) -- the whole
//      "Previous Papers" grid + Filters button, entirely self-contained
//      (it fetches its own data from the backend).
//
// This file itself doesn't talk to the backend at all -- it's purely
// layout, composing already-built pieces together.

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import PreviousPapersSection from "@/components/History";

export default function HomePage() {
  // The plain HTML <input type="file"> element is invisible (see
  // className="hidden" below) -- clicking the leather-pad tray instead
  // triggers a click on this hidden input, via this ref, which is how
  // you get a custom-looking "upload" button while still using the
  // browser's real, built-in file picker underneath.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Just remembers which file name to show as feedback after picking
  // one. IMPORTANT: this does NOT send the file anywhere. There is no
  // backend route yet that accepts an uploaded PDF (see the earlier
  // conversation about the /analyze endpoint not existing) -- your
  // teammates' PDF-parsing and AI-summarizing pipeline has to exist
  // first. This is purely the visual "you picked a file" feedback.
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  function handleUploadTrayClick() {
    if (fileInputRef.current !== null) {
      fileInputRef.current.click();
    }
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const chosenFiles = event.target.files;
    if (chosenFiles !== null && chosenFiles.length > 0) {
      setSelectedFileName(chosenFiles[0].name);
    } else {
      setSelectedFileName(null);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />

      {/* The main wood-desk hero area. */}
      <div
        className="relative flex flex-1 items-center justify-center gap-16 px-16"
        style={{ backgroundImage: "url(/background/wood.png)", backgroundSize: "cover" }}
      >
        {/* The "Visualize your research, your way" card.

            Gotcha worth knowing if you touch this: torn-paper.svg's own
            painted shape doesn't actually fill its whole file -- stretching
            it across a TALL card (via `fill` + object-fill) left the
            bottom half see-through, because there was nothing painted
            there to stretch. Instead of fighting that, this card is a
            plain solid rectangle (bg-stone-50) that holds the actual text
            in normal document flow -- and torn-paper.svg is only used as
            a thin decorative strip pinned to the very bottom, where its
            actual ragged edge reads correctly at a size close to its
            natural proportions. */}
        <div className="relative w-96 bg-stone-50 pb-9 shadow-lg">
          <Image
            src="/interface/magnifying-glass.png"
            alt=""
            width={110}
            height={90}
            className="absolute -left-12 -top-8 z-10 h-auto w-28 -rotate-12 object-contain"
          />

          <div className="flex flex-col items-center gap-4 px-12 py-10 text-center">
            <p className="font-serif text-3xl leading-snug text-stone-900">
              Visualize your research, your way.
            </p>
            <p className="font-serif text-base text-stone-600">
              Research analysis tools tailored to your level of understanding.
            </p>
          </div>

          <div className="absolute bottom-0 left-0 h-9 w-full">
            <Image src="/interface/torn-paper.svg" alt="" fill className="object-fill" />
          </div>
        </div>

        {/* The leather-pad "Upload PDF" tray. */}
        <button
          type="button"
          onClick={handleUploadTrayClick}
          className="relative h-96 w-96 shrink-0"
        >
          <Image
            src="/interface/leather-pad.png"
            alt=""
            width={400}
            height={400}
            className="h-full w-full object-contain"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="font-serif text-lg text-white">Upload PDF</span>
            <Image src="/icons/upload.svg" alt="" width={50} height={52} />
            {selectedFileName !== null && (
              <span className="mt-2 max-w-55 truncate font-serif text-xs text-stone-200">
                {selectedFileName}
              </span>
            )}
          </div>
        </button>

        {/* The actual, invisible file picker input. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* The "Previous Papers" section -- entirely built and data-fetched
          inside History.tsx. This page just drops it in. */}
      <PreviousPapersSection />
    </div>
  );
}
