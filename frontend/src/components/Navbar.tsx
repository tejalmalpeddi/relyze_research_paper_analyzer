// components/Navbar.tsx
//
// The top navigation bar shown on every page -- the "Relyze" logo card,
// the bulldog clip graphic, the row of page tabs, and the profile icon.
//
// This is rendered separately by EACH page (app/page.tsx and
// app/mindmap/page.tsx both import and render it themselves) rather than
// living in app/layout.tsx. That's a deliberate choice: layout.tsx wraps
// literally every route in the whole app, but right now we only have two
// real pages that need this exact navbar, so keeping it as an explicit
// component that each page chooses to render is simpler to reason about
// than threading it through the shared root layout.
//
// Only two of the five tabs shown actually go anywhere: "Home Page" (the
// homepage, at "/") and "Mind Map" (at "/mindmap"). "Background",
// "Interactive Paper", and "Relevant Papers" are drawn to match the
// hi-fi mockup, but there is no page behind them yet -- clicking them
// does nothing on purpose, rather than sending someone to a broken link.

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// One entry per tab drawn in the bar. `href` is null for the three tabs
// that don't have a real page behind them yet.
interface NavTab {
  label: string;
  href: string | null;
}

const NAV_TABS: NavTab[] = [
  { label: "Home Page", href: "/" },
  { label: "Mind Map", href: "/mindmap" },
  { label: "Background", href: null },
  { label: "Interactive Paper", href: null },
  { label: "Relevant Papers", href: null },
];

export default function Navbar() {
  // usePathname() is a Next.js hook that returns the current URL path
  // (e.g. "/" or "/mindmap"), so we can figure out which tab to highlight
  // as "active" without the page having to pass that information down
  // manually as a prop.
  const currentPath = usePathname();

  return (
    <div className="relative flex items-center gap-4 border-b border-black/20 bg-[#3b291e] px-6 py-4">
      {/* The "Relyze" logo card -- a torn-paper shape, rotated slightly,
          sitting in the top-left corner. Fixed h-16 w-44 + fill +
          object-fill, same reasoning as the homepage's Visualize card:
          torn-paper.svg's own internal shape is a wide flat banner, so
          letting the browser compute a dimension automatically (h-auto)
          would use ITS ratio instead of the card shape we actually want. */}
      <div className="relative h-16 w-44 -rotate-6">
        <Image src="/interface/torn-paper.svg" alt="" fill className="object-fill" />
        <span className="absolute inset-0 flex items-center justify-center font-serif text-2xl italic text-stone-900">
          Relyze
        </span>
      </div>

      {/* The row of page tabs. Each one is wrapped in its own relatively-
          positioned container so the bulldog clip (rendered only on the
          currently-active tab) can be absolutely positioned directly
          above THAT tab, no matter how the flex layout shifts things
          around -- see the comment inside the loop below. */}
      <div className="flex items-end gap-3">
        {NAV_TABS.map((tab) => {
          // Figure out, in a fully spelled-out way, whether this
          // particular tab is the one the user is currently on.
          let isActiveTab: boolean;
          if (tab.href !== null && tab.href === currentPath) {
            isActiveTab = true;
          } else {
            isActiveTab = false;
          }

          // Decide the tab's background styling based on whether it's
          // active, and whether it even has a real page behind it.
          let tabBackgroundClassName: string;
          if (isActiveTab === true) {
            tabBackgroundClassName = "bg-stone-50 shadow-md";
          } else if (tab.href !== null) {
            tabBackgroundClassName = "bg-stone-200 hover:bg-stone-100";
          } else {
            // No real page yet -- keep it visually present but slightly
            // duller, and non-interactive (see the plain <div> below).
            tabBackgroundClassName = "bg-stone-300/70 cursor-default";
          }

          const tabContent = (
            <div
              className={`rounded-t-sm px-5 py-3 font-serif text-base text-stone-900 ${tabBackgroundClassName}`}
            >
              {tab.label}
            </div>
          );

          return (
            <div key={tab.label} className="relative">
              {/* Only draw the clip above whichever tab is currently
                  active -- this is what makes it visually "jump" from
                  Home Page to Mind Map as you navigate between them. */}
              {isActiveTab === true && (
                <Image
                  src="/interface/clip.png"
                  alt=""
                  width={60}
                  height={70}
                  className="pointer-events-none absolute -top-9 left-1/2 h-auto w-14 -translate-x-1/2"
                />
              )}

              {/* If this tab has a real page, make it a clickable link.
                  If it doesn't (Background / Interactive Paper / Relevant
                  Papers), render the exact same look as a plain, inert
                  div instead, so clicking it does nothing. */}
              {tab.href !== null ? (
                <Link href={tab.href}>{tabContent}</Link>
              ) : (
                tabContent
              )}
            </div>
          );
        })}
      </div>

      {/* Profile icon, pinned to the far right. Not wired to any real
          account/auth system -- purely decorative, matching the mockup. */}
      <div className="ml-auto flex h-11 w-11 items-center justify-center rounded-md border border-stone-400 bg-stone-300">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill="#1c1c1c" />
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#1c1c1c" />
        </svg>
      </div>
    </div>
  );
}
