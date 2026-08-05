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

// useRef: a NEW hook, different from useState. Like useState, it gives
// you a box that survives across re-renders. UNLIKE useState, changing a
// ref's value does NOT trigger a re-render -- React just silently
// remembers it. Refs are most commonly used to get a direct handle on a
// real, physical DOM element (like the hidden <input> below), so you can
// call real browser methods on it (like .click()) from your own code.
import { useRef, useState } from "react";
import UploadPDF from "@/components/home/uploadpdf";
import VisualizeBlurb from "@/components/home/visualizeblurb";
import PreviousPapers from "@/components/home/previouspapers";
import UploadPopup from "@/components/home/uploadpopup";
import NavBarFull from "@/components/navbar/NavBarFull";
import PreviousPapersSection from "@/components/History";

export default function Home() {

  return (
    <main className="sticky top-[0] h-fit">
      {/* Upper Desk Section */}
      {/* "Visualize..." hero blurb + Upload PDF */}
      <section
        className="h-[90vh] max-h-[700px] w-full bg-cover bg-center shadow-xl/50 flex items-center justify-center gap-10 pt-[5%]"
        style={{ backgroundImage: "url('/background/wood.png')" }}
      >
        <VisualizeBlurb/>
        <UploadPDF/>
                
      </section>


      {/* Previous Papers Section */}
      <PreviousPapers/>
      

      {/* Drawer Background */}
      {/* fixed to the bottom of the screen to give "pulling out drawer" effect */}
      {/* borders adapt to screen size */}
      <div className="drawer-bg fixed bottom-0 left-0 w-full h-screen box-border -z-10"></div>
    </main>
  );

}

