// components/History.tsx
//
// EVERY component related to browsing saved papers lives in this one
// file, on purpose (you asked for history components to be grouped into
// a single file, separate from the mind-map components in MindMap.tsx).
// From top to bottom, in the order they appear below:
//
//   MaskedIcon           -- a small helper for recoloring the black-and-
//                            white SVG icon files to match the mockup's
//                            colors (see its own comment for how/why).
//   FiltersPanel          -- the popover with the filter checkboxes.
//   PaperCard             -- one single card in the "Previous Papers" grid.
//                            Its delete confirmation is the shared
//                            deletePaperConfirm Popup (components/popups/popup.tsx)
//                            rather than a component defined in this file --
//                            see the note above isDeleteConfirmOpen below.
//   PreviousPapersSection -- the piece the homepage actually imports: the
//                            "Previous Papers" header, the Filters button,
//                            and the grid of PaperCards. This is also the
//                            ONLY component in this file that talks to the
//                            backend -- it fetches the list itself.

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HistoryEntry } from "@/lib/types";
import { fetchHistoryList, renameHistory, ApiError } from "@/lib/api";
import { useAuth } from '@/app/auth/auth-query';
import Popup from "@/components/popups/popup";
import useScrollJack from "./home/scrolljack";

// ---------------------------------------------------------------------
// MaskedIcon
// ---------------------------------------------------------------------
//
// The icon files under public/icons/ are plain black SVGs (their fill
// color is baked into the file itself). An ordinary <img> or Next.js
// <Image> tag always draws them in that one baked-in color -- there is
// no "color" prop that could make an <Image> draw the trash icon in red
// instead of black.
//
// To get around that, this component uses the icon file as a CSS "mask"
// instead of a picture: a mask tells the browser "only show my
// background color in the shape of this image, and hide it everywhere
// else." That means the actual VISIBLE color comes from a plain CSS
// backgroundColor we choose ourselves, while the SHAPE still comes from
// the SVG file. This is the only place in the whole app that needs this
// trick -- everywhere else, an icon's own built-in color already matches
// what the mockup wants.
interface MaskedIconProps {
  iconPath: string;
  colorHex: string;
  sizePixels: number;
}

function MaskedIcon({ iconPath, colorHex, sizePixels }: MaskedIconProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: sizePixels,
        height: sizePixels,
        backgroundColor: colorHex,
        WebkitMaskImage: `url(${iconPath})`,
        maskImage: `url(${iconPath})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

// ---------------------------------------------------------------------
// tagColorFor
// ---------------------------------------------------------------------
//
// Picks a background/text color pair for a filter tag chip, out of a
// small hand-picked palette that fits the parchment/torn-paper look
// used everywhere else in this file (muted, not neon). The same tag
// string always maps to the same color -- across every card on the
// page -- by hashing the string into an index instead of assigning
// colors in the order tags happen to be encountered.
const TAG_COLOR_PALETTE: { background: string; text: string }[] = [
  { background: "#EADCF8", text: "#6B21A8" }, // violet
  { background: "#F3D9DC", text: "#9B3D44" }, // dusty rose
  { background: "#E4E8D9", text: "#556B2F" }, // sage
  { background: "#DCEAF3", text: "#2B5D77" }, // dusty blue
  { background: "#F5E6C8", text: "#8A6D1D" }, // mustard
  { background: "#E6DED3", text: "#5B4636" }, // brown
];

function tagColorFor(tag: string): { background: string; text: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[index];
}

// ---------------------------------------------------------------------
// FiltersPanel
// ---------------------------------------------------------------------
//
// The little torn-paper popover with a checkbox per filter tag. The list
// of checkboxes is NOT hardcoded -- it's built from whatever filter tags
// actually exist across the currently-loaded papers, so this stays
// correct automatically as more papers (with more/different tags) get
// saved.
interface FiltersPanelProps {
  availableFilterTags: string[];
  selectedFilterTags: Set<string>;
  onToggleFilterTag: (tag: string) => void;
}

function FiltersPanel({
  availableFilterTags,
  selectedFilterTags,
  onToggleFilterTag,
}: FiltersPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <form className="relative inline-flex flex-col w-[50%] max-w-[300px] z-50">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center justify-between bg-off-white p-4"
      >
        <h2>Filters</h2>
        <img src="/icons/filter.svg" alt="Filter icon" className="size-8 object-contain" />
      </button>

      {expanded && (
        <div className="absolute top-[100%] drop-shadow-lg/50 w-full">
          <ul className="bg-white px-4 pt-2 pb-4 w-full">
            {availableFilterTags.length === 0 ? (
              <li className="my-2 text-sm text-stone-500">No filters yet.</li>
            ) : (
              availableFilterTags.map((tag) => {
                // Spelled out instead of a ternary: is this specific tag
                // currently checked?
                let isChecked: boolean;
                if (selectedFilterTags.has(tag) === true) {
                  isChecked = true;
                } else {
                  isChecked = false;
                }

                return (
                  <li key={tag}>
                    <button
                      type="button"
                      onClick={() => onToggleFilterTag(tag)}
                      className="w-full inline-flex items-center gap-3 my-2 cursor-pointer"
                    >
                      <span className="flex h-5 w-5 items-center justify-center border border-stone-500">
                        {isChecked === true && (
                          <Image src="/icons/check-mark.svg" alt="" width={12} height={12} />
                        )}
                      </span>
                      {tag}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <img src="/interface/torn-paper.svg" alt="Torn paper" />
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------
// PaperCard
// ---------------------------------------------------------------------
//
// One single card in the grid. Owns two small pieces of LOCAL state:
// whether its own options row (trash / redirect / rename) is currently
// showing, and whether its own delete-confirmation popup is currently
// showing. Neither of those needs to be known by any other card or by
// the parent list -- exactly like PaperNode's own isContentOpen state in
// MindMap.tsx, each card manages its own little bit of "am I open right
// now" independently.
//
// The delete confirmation itself is the shared deletePaperConfirm Popup
// (components/popups/popup.tsx) -- it owns the real deleteHistory()
// backend call and its own error/loading state internally now, so this
// card only needs to open/close it and react to onDeleted.
interface PaperCardProps {
  entry: HistoryEntry;
  onDeleted: (deletedId: string) => void;
  onRenamed: () => void;
}

function PaperCard({ entry, onDeleted, onRenamed }: PaperCardProps) {
  const router = useRouter();

  const [isOptionsRowOpen, setIsOptionsRowOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [content, setContent] = useState<string>(entry.title);
  // Shared between the rename flow below and (previously) the delete
  // flow -- delete errors now show inside the popup itself instead, so
  // this is only ever set by saveChanges() at this point.
  const [renameErrorMessage, setRenameErrorMessage] = useState<string | null>(null);

  function handleOptionsButtonClick() {
    if (isOptionsRowOpen === true) {
      setIsOptionsRowOpen(false);
    } else {
      setIsOptionsRowOpen(true);
    }
  }

  function handleTrashButtonClick() {
    setIsDeleteConfirmOpen(true);
  }

  // This is the button "next to the trash" you pointed out -- it sends
  // the user to the Mind Map page, passing along WHICH paper to show via
  // a "?id=" query parameter on the URL. See app/mindmap/page.tsx for how
  // that id is read back out and turned into a real map on screen.
  function handleRedirectButtonClick() {
    router.push(`/mindmap?id=${entry.id}`);
  }

  // Not implemented yet -- there's no backend route for renaming a saved
  // paper's title (it would need something like a PATCH /history/{id}
  // endpoint, which doesn't exist). Left as a visible but non-functional
  // button, matching the mockup, rather than silently pretending it works.
  function handleRenameButtonClick() {
    setIsEditing(true);
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
  };

  const saveChanges = async (nextContent: string) => {
    const nextTitle = nextContent.trim();

    if (!nextTitle) {
      setContent(entry.title);
      setIsEditing(false);
      return;
    }

    try {
      await renameHistory(entry.id, nextTitle);
      onRenamed();
    } catch (error) {
      setContent(entry.title);
      if (error instanceof Error) {
        setRenameErrorMessage(error.message);
      } else {
        setRenameErrorMessage("Failed to rename history title.");
      }
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <li className="relative">
      <div className="flex h-40 w-full items-center justify-center bg-stone-50 shadow-md">
        {/* No real thumbnail/preview image exists for a paper's map yet --
            this is intentionally left as a plain blank card, matching the
            mockup exactly. */}
      </div>

      <div className="flex items-center justify-between bg-stone-200 px-3 py-2">
        {isEditing ? (<input
          value={content}
          onChange={handleTextChange}
          onBlur={() => {
            saveChanges(content);
          }}
          placeholder={content}
          className="font-serif text-sm font-semibold text-stone-900 flex-1 min-w-0 bg-white"
        />) : (
          <span className="flex-1 min-w-0 line-clamp-2 font-serif text-sm font-semibold text-stone-900">
            {content}
          </span>
        )}
        <button
          type="button"
          onClick={handleOptionsButtonClick}
          aria-label="Show options for this paper"
          className="shrink-0 ml-2"
        >
          <Image src="/icons/options.svg" alt=""width={16} height={16} />
        </button>
      </div>

      {entry.filters.length > 0 && (
        <div className="flex flex-wrap gap-1 bg-stone-200 px-3 pb-2">
          {entry.filters.map((tag) => {
            const color = tagColorFor(tag);
            return (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 font-serif text-[9px] leading-tight"
                style={{ backgroundColor: color.background, color: color.text }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {
        isOptionsRowOpen === true && (
          <menu className="flex items-center justify-center gap-6 bg-stone-100 py-3">
            <button type="button" onClick={handleTrashButtonClick} aria-label="Delete this paper">
              <MaskedIcon iconPath="/icons/trash.svg" colorHex="#b3555f" sizePixels={20} />
            </button>
            <button
              type="button"
              onClick={handleRedirectButtonClick}
              aria-label="Open this paper's mind map"
            >
              <MaskedIcon iconPath="/icons/redirect.svg" colorHex="#3f3a30" sizePixels={20} />
            </button>
            <button type="button" onClick={handleRenameButtonClick} aria-label="Rename this paper">
              <MaskedIcon iconPath="/icons/rename.svg" colorHex="#3f3a30" sizePixels={20} />
            </button>
          </menu>
        )
      }

      {isDeleteConfirmOpen && (
        <Popup
          type="deletePaperConfirm"
          paperId={String(entry.id)}
          paperTitle={entry.title}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onDeleted={() => onDeleted(entry.id)}
        />
      )}

      {
        renameErrorMessage !== null && (
          <p className="mt-1 text-center font-serif text-xs text-[#c1666b]">
            {renameErrorMessage}
          </p>
        )
      }
    </li >
  );
}

// ---------------------------------------------------------------------
// PreviousPapersSection
// ---------------------------------------------------------------------
//
// The piece app/page.tsx actually imports and renders. This is the ONE
// component in this file that owns real state and talks to the backend
// directly -- it fetches the full paper list itself the moment it first
// appears on screen, the same way page.tsx used to in the very first
// version of this app.
export default function PreviousPapersSection() {
  const listRef = useScrollJack();
  
  const router = useRouter();

  //current value and function to change it.
  //changes entries(paper starts as empty list), isLoading, loadErrorMessage, filter tags, and filter panel open
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  // True specifically when the backend said "you're not logged in" (a 401
  // from GET /history, which now always filters by whoever's cookie sent
  // the request). Kept separate from loadErrorMessage so the UI can show
  // a friendly "please log in" prompt instead of a scary error message.
  const [selectedFilterTags, setSelectedFilterTags] = useState<Set<string>>(new Set());
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  //useEffect: run the first argument (the function) after this component (previous papers page)
  //renders, and only re-run it again later if something in the dependency array has changed since 
  // last time." An empty array means "nothing to compare against, so never re-run it"
  // in practice, that makes this run exactly once, right after PreviousPapersSection 
  // first appears on screen.


  //fetchHistoryList() sends network request to GET/history 
  //Inside handleResponse (in lib/api.ts), the line 
  // const parsedData = await response.json(); takes that raw text and turns it into a real,
  // usable JavaScript array/object. parsed from JSON is what enters as input "fetchedEntries"
  //then, catch, finally is promise chaining for error handling instead of nested ifs and callbacks
  function loadHistory() {
    setIsLoading(true);
    fetchHistoryList() //async function from api.ts that needs .then to complete once succeeds
      .then((fetchedEntries) => {
        setEntries(fetchedEntries);
        setLoadErrorMessage(null);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          // Nobody's logged in -- this isn't really a failure, so it
          // doesn't go into loadErrorMessage at all.
        } else if (error instanceof Error) {
          setLoadErrorMessage(error.message);
        } else {
          setLoadErrorMessage("Something went wrong while loading your papers.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  useEffect(() => {
    fetchHistoryList()
      .then((fetchedEntries) => {
        setEntries(fetchedEntries);
        setLoadErrorMessage(null);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          // Nobody's logged in -- this isn't really a failure, so it
          // doesn't go into loadErrorMessage at all.
        } else if (error instanceof Error) {
          setLoadErrorMessage(error.message);
        } else {
          setLoadErrorMessage("Something went wrong while loading your papers.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    // function handleWindowFocus() {
    //   loadHistory();
    // }

    // window.addEventListener("focus", handleWindowFocus);
    // return () => {
    //   window.removeEventListener("focus", handleWindowFocus);
    // };
  }, []);

  // Called by a PaperCard after its deletePaperConfirm popup successfully
  // deletes it on the backend -- removes that same entry from THIS list,
  // so the grid updates immediately without needing to re-fetch everything.
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
  // build the FiltersPanel's checkbox list. Recomputed only when
  // `entries` actually changes, not on every render.
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
  // checked, show everything; otherwise, only show papers that have AT
  // LEast one of the checked tags.
  const visibleEntries = useMemo(() => {
    if (selectedFilterTags.size === 0) {
      return entries;
    }
    return entries.filter((entry) =>
      entry.filters.some((tag) => selectedFilterTags.has(tag))
    );
  }, [entries, selectedFilterTags]);

  return (
      <section className="h-[80vh] p-20 pt-0">
        <header className="flex justify-between mb-12">
          <h2 className="text-white pt-[2rem]">Previous Papers</h2>
          <FiltersPanel
            availableFilterTags={availableFilterTags}
            selectedFilterTags={selectedFilterTags}
            onToggleFilterTag={handleToggleFilterTag}
          />
        </header>

        {isLoading === true && (
          <p className="font-serif text-stone-300">Loading your papers...</p>
        )}

        {isLoading === false && loadErrorMessage !== null && (
          <p className="font-serif text-[#c1666b]">
            Couldn&apos;t load your papers: {loadErrorMessage}
          </p>
        )}

        {isLoading === false &&
          (isAuthenticated === true && visibleEntries.length === 0) && (
            <div className="flex w-full flex-col items-center gap-4 py-10 text-center">
              <p className="font-serif text-stone-300">
                No saved papers yet. Upload a PDF to see it here.
              </p>
            </div>
          )
        }

        {/* Covers two cases with the same message: an explicit 401 from
            the backend (isLoggedOut), and a plain empty list with no
            error. Both currently mean the same thing in practice, since
            nobody being logged in shows up as an empty list rather than
            a 401 right now -- see the note on PreviousPapersSection. */}
        {isLoading === false &&
          loadErrorMessage === null &&
          (isAuthenticated === false) && (
            <div className="flex w-full flex-col items-center gap-4 py-10 text-center">
              <p className="font-serif text-stone-300">
                You are currently logged out, nothing to display!
              </p>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="rounded-sm bg-[#5b4636] px-6 py-2 font-serif font-semibold text-white"
              >
                Sign In
              </button>
            </div>
          )}

        <ul
        ref={listRef}
        className="h-[90%] grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-4 overflow-hidden mt-4 mb-50 scrollbar-hidden"
    >
        {isLoading === false &&
          isAuthenticated === true &&
          loadErrorMessage === null &&
          visibleEntries.map((entry) => (
            <PaperCard key={entry.id} entry={entry} onDeleted={handlePaperDeleted} onRenamed={loadHistory}/>
          ))}
      </ul>
      </section>
  );
}