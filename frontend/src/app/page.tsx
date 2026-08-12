// app/page.tsx
//
// The actual homepage -- shown at "/". Three pieces, stacked vertically:
//   2. The "hero" area -- the wood-desk background, the "Visualize your
//      research, your way" card, and the leather upload tray.
//   3. PreviousPapersSection (components/History.tsx) -- the whole
//      "Previous Papers" grid + Filters button, entirely self-contained
//      (it fetches its own data from the backend).
//
// This file itself doesn't talk to the backend at all -- it's purely
// layout, composing already-built pieces together.

"use client";

// useRef: a NEW hook, different from useState. Like useState, it gives
// you a box that survives across re-renders. UNLIKE useState, changing a
// ref's value does NOT trigger a re-render -- React just silently
// remembers it. Refs are most commonly used to get a direct handle on a
// real, physical DOM element (like the hidden <input> below), so you can
// call real browser methods on it (like .click()) from your own code.
import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PreviousPapersSection from "@/components/History";
import { importPdf } from "@/lib/api";

export default function HomePage() {
  // useRef<HTMLInputElement>(null) -- the <HTMLInputElement> generic says
  // "whatever real DOM element this ref eventually points at will be an
  // <input> element specifically" (not a <div>, not a <button>, etc.).
  //
  // The plain HTML <input type="file"> element is invisible (see
  // className="hidden" below) -- clicking the leather-pad tray instead
  // triggers a click on this hidden input, via this ref, which is how
  // you get a custom-looking "upload" button while still using the
  // browser's real, built-in file picker underneath.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Just remembers which file name to show as feedback after picking
  // one.
  // useState: the moment a file is picked,the screen needs to actually update to show the file name text.
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Runs when you click the big leather-pad tray (the visible "button").
  // fileInputRef.current is where React actually stores the real <input>
  function handleUploadTrayClick() {
    if (fileInputRef.current !== null) {
      fileInputRef.current.click();
    }
  }

  // Runs automatically whenever the browser's real file picker closes
  // with a file chosen (wired up below via onChange={handleFileInputChange}
  // on the actual <input>).
  async function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    // collection of every file the user selected (could be more than one
    // if the input allowed it, though this one only expects a single PDF).
    const chosenFiles = event.target.files;

    // chosenFiles can technically be null (nothing selected / picker was
    // cancelled), and even if it exists it could be empty -- both checked
    // here before trying to read anything out of it.
    if (chosenFiles !== null && chosenFiles.length > 0) {
      const file = chosenFiles[0];
      setSelectedFileName(file.name);
      setImportError(null);
      setIsImporting(true);

      try {
        const imported = await importPdf(file);
        router.push(`/mindmap?id=${imported.history.id}`);
      } catch (error) {
        setImportError("Import failed. Check the backend logs.");
        console.error("Failed to import PDF:", error);
      } finally {
        setIsImporting(false);
      }
    } else {
      // Nothing was actually selected -- clear out any previously shown
      // filename instead of leaving stale text on screen.
      setSelectedFileName(null);
    }
  }

  // Everything below is JSX -- describes what should appear on screen,
  // re-run every time this component re-renders (e.g. after
  // setSelectedFileName runs). Same "flex h-screen flex-col" full-page
  // layout trick as the Mind Map page
  return (
    <div className="flex min-h-screen flex-col">

      {/* The main wood-desk hero area. */}
      <div
        className="relative flex flex-1 items-center justify-center gap-16 px-16"
        style={{ backgroundImage: "url(/background/wood.png)", backgroundSize: "cover" }}
      >
        {/* The "Visualize your research, your way" card.*/}
        <div className="relative w-96 bg-stone-50 pb-9 shadow-lg">
          <Image
            src="/interface/magnifying-glass.png"
            alt=""
            width={110}
            height={90}
            className="absolute -left-25 -top-10 z-10 h-auto w-60 -rotate-20 object-contain -scale-x-100"
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

        {/* The leather-pad "Upload PDF" tray -- this is the actual,
            visible, clickable thing you see and press. It's a real
            <button>, styled to look like a leather pad image, NOT the
            real file input itself (that one's hidden below). Clicking it
            runs handleUploadTrayClick, which finds the real hidden
            <input> via fileInputRef and calls .click() on it. */}
        <button
          type="button"
          onClick={handleUploadTrayClick}
          disabled={isImporting}
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
            <span className="font-serif text-lg text-white">
              {isImporting ? "Importing PDF..." : "Upload PDF"}
            </span>
            <Image src="/icons/upload.svg" alt="" width={50} height={52} />
            {/* Same {condition && (...)} idiom from the Mind Map page:
                only show the filename text once something has actually
                been picked (selectedFileName is no longer null). */}
            {selectedFileName !== null && (
              <span className="mt-2 max-w-55 truncate font-serif text-xs text-stone-200">
                {selectedFileName}
              </span>
            )}
            {importError !== null && (
              <span className="mt-2 max-w-60 text-center font-serif text-xs text-red-200">
                {importError}
              </span>
            )}
          </div>
        </button>

        {/* The actual, invisible file picker input -- this is the REAL
            file-picker the browser knows how to open; className="hidden"
            makes it invisible on screen, but it's still a fully working
            element sitting in the page.
              - ref={fileInputRef}: this is the line that actually fills
                in fileInputRef.current, the moment this <input> mounts --
                connecting the plain JS ref object from earlier to this
                specific, real DOM element.
              - type="file": tells the browser this input's job is
                picking a file, not typing text.
              - accept="application/pdf": hints to the browser's file
                picker to only show/allow PDF files (a UI hint, not a
                hard security guarantee).
              - onChange={handleFileInputChange}: runs the function from
                earlier the moment a file is actually chosen. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* The "Previous Papers" section -- entirely built and data-fetched
          inside History.tsx.*/}
      <PreviousPapersSection />
    </div>
  );
}
