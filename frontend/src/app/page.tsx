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
import Popup from "@/components/popups/popup";
import { importPdf } from "@/lib/api";
import VisualizeBlurb from "@/components/home/visualizeblurb";

// Which popup (if any) the upload flow currently needs shown. "uploading"
// needs its own uploadId (for the future cancelUpload() call) and the
// picked file's name (shown as the popup's topText); "difficultySelect"
// only needs the id the backend gave back for the newly-created paper.
type UploadPopupState =
  | { stage: "uploading"; uploadId: string; fileName: string }
  | { stage: "difficultySelect"; paperId: string };

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

  // Drives the Uploading / Difficulty Select popups. null = neither is
  // showing.
  const [uploadPopup, setUploadPopup] = useState<UploadPopupState | null>(null);

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
      // Show the Uploading popup right away, with a fresh id for this
      // particular upload (only used for the future cancelUpload() call
      // -- it has nothing to do with the backend yet).
      setUploadPopup({ stage: "uploading", uploadId: crypto.randomUUID(), fileName: file.name });

      try {
        const imported = await importPdf(file);
        // This resolving IS the real "upload finished" signal -- instead
        // of routing straight to the mind map, swap the popup over to
        // Difficulty Select for the paper that was just created.
        setUploadPopup({ stage: "difficultySelect", paperId: String(imported.history.id) });
      } catch (error) {
        setImportError("Import failed. Check the backend logs.");
        console.error("Failed to import PDF:", error);
        // Something went wrong -- close the popup and fall back to the
        // existing inline error text under the upload tray.
        setUploadPopup(null);
      } finally {
        setIsImporting(false);
      }
    } else {
      // Nothing was actually selected -- clear out any previously shown
      // filename instead of leaving stale text on screen.
      setSelectedFileName(null);
    }
  }

  // Called when the Uploading popup's "Cancel Upload" button is pressed
  // (that button already tried the real cancelUpload() backend call
  // itself first, skeleton for now). This just clears the popup from the
  // page either way. Note: the in-flight importPdf() request itself isn't
  // actually aborted by this yet -- there's no real backend cancellation
  // wired up, so it'll keep running in the background even once the
  // popup's gone, until that's implemented.
  function handleUploadCancelled() {
    setUploadPopup(null);
    setIsImporting(false);
  }

  // Everything below is JSX -- describes what should appear on screen,
  // re-run every time this component re-renders (e.g. after
  // setSelectedFileName runs). Same "flex h-screen flex-col" full-page
  // layout trick as the Mind Map page
  return (
    <main className="flex min-h-screen flex-col overflow-x-clip">

      {/* The main wood-desk hero area. */}
      <section
        className="relative left-1/2 h-[90vh] max-h-[700px] w-screen -translate-x-1/2 bg-cover bg-center shadow-xl/50 flex items-center justify-center gap-10 pt-[5%]"
        style={{ backgroundImage: "url('/background/wood.png')" }}
      >
        {/* The "Visualize your research, your way" card.*/}
        <VisualizeBlurb />

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
          className="relative aspect-3/4 h-full bg-contain bg-center bg-no-repeat cursor-pointer flex flex-col items-center justify-center gap-3 text-white"
          style={{ backgroundImage: "url(/interface/leather-pad.png)" }}
        >
            <h2 className="text-stone-200">
              {isImporting ? "Importing PDF..." : "Upload PDF"}
            </h2>
            <Image src="/icons/upload.svg" alt="" width={70} height={70} />
            {/* Same {condition && (...)} idiom from the Mind Map page:
                only show the filename text once something has actually
                been picked (selectedFileName is no longer null). */}
            {selectedFileName !== null && (
              <p className="mt-2 max-w-[60%] truncate text-stone-200">
                {selectedFileName}
              </p>
            )}
            {importError !== null && (
              <p className="mt-2 max-w-[60%] text-center text-red-200">
                {importError}
              </p>
            )}
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
      </section>

      {/* The "Previous Papers" section -- entirely built and data-fetched
          inside History.tsx.*/}
      <PreviousPapersSection />
      <div className="drawer-bottom-rail pointer-events-none fixed bottom-0 left-0 z-[60] h-16 w-full" aria-hidden="true"></div>

      {uploadPopup?.stage === "uploading" && (
        <Popup
          type="uploading"
          uploadId={uploadPopup.uploadId}
          fileName={uploadPopup.fileName}
          onClose={handleUploadCancelled}
        />
      )}

      {uploadPopup?.stage === "difficultySelect" && (
        <Popup
          type="difficultySelect"
          paperId={uploadPopup.paperId}
          onClose={() => setUploadPopup(null)}
        />
      )}


      {/* Drawer Background */}
      {/* fixed to the bottom of the screen to give "pulling out drawer" effect */}
      {/* borders adapt to screen size */}
      <div className="drawer-bg fixed bottom-0 left-0 w-full h-screen box-border -z-10"></div>

    </main>
  );

}
