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
//   DeleteConfirmModal    -- the "Keep / Delete" confirmation dialog.
//   PaperCard             -- one single card in the "Previous Papers" grid.
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
import { fetchHistoryList, deleteHistory, ApiError } from "@/lib/api";
import { useAuth } from '@/app/auth/auth-query';

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
  onClose: () => void;
}

function FiltersPanel({
  availableFilterTags,
  selectedFilterTags,
  onToggleFilterTag,
  onClose,
}: FiltersPanelProps) {
  return (
    <div className="relative w-64 rounded-sm bg-stone-50 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-lg text-stone-900">Filters</h3>
        <button type="button" onClick={onClose} aria-label="Close filters">
          <Image src="/icons/filter.svg" alt="" width={20} height={20} />
        </button>
      </div>

      {availableFilterTags.length === 0 ? (
        <p className="font-serif text-sm text-stone-500">
          No filter tags on any saved paper yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {availableFilterTags.map((tag) => {
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
                  className="flex items-center gap-3 font-serif text-base text-stone-800"
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
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// DeleteConfirmModal
// ---------------------------------------------------------------------
//
// A simple "are you sure" dialog. It doesn't know how to actually delete
// anything itself -- it just calls the onConfirm function it was handed,
// and lets whoever rendered it (PaperCard, below) decide what that
// actually does.
interface DeleteConfirmModalProps {
  paperTitle: string;
  onConfirmDelete: () => void;
  onKeep: () => void;
}

function DeleteConfirmModal({
  paperTitle,
  onConfirmDelete,
  onKeep,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-sm border border-stone-400 bg-stone-100 p-8 text-center shadow-2xl">
        <p className="mb-6 font-serif text-lg text-stone-900">
          Are you sure you want to delete &quot;{paperTitle}&quot;?
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onKeep}
            className="rounded-sm bg-[#5b4636] px-6 py-2 font-serif text-white"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            className="rounded-sm bg-[#c1666b] px-6 py-2 font-serif text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// PaperCard
// ---------------------------------------------------------------------
//
// One single card in the grid. Owns two small pieces of LOCAL state:
// whether its own options row (trash / redirect / rename) is currently
// showing, and whether its own delete-confirmation modal is currently
// showing. Neither of those needs to be known by any other card or by
// the parent list -- exactly like PaperNode's own isContentOpen state in
// MindMap.tsx, each card manages its own little bit of "am I open right
// now" independently.
interface PaperCardProps {
  entry: HistoryEntry;
  onDeleted: (deletedId: number) => void;
}

function PaperCard({ entry, onDeleted }: PaperCardProps) {
  const router = useRouter();

  const [isOptionsRowOpen, setIsOptionsRowOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  function handleOptionsButtonClick() {
    if (isOptionsRowOpen === true) {
      setIsOptionsRowOpen(false);
    } else {
      setIsOptionsRowOpen(true);
    }
  }

  function handleTrashButtonClick() {
    setIsDeleteModalOpen(true);
  }

  function handleKeepButtonClick() {
    setIsDeleteModalOpen(false);
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
    // Intentionally does nothing right now.
  }

  async function handleConfirmDeleteClick() {
    setIsDeleting(true);
    setDeleteErrorMessage(null);
    try {
      await deleteHistory(entry.id);
      // Tell the parent grid to drop this card from the list it's
      // showing -- see PreviousPapersSection's handlePaperDeleted below.
      onDeleted(entry.id);
    } catch (error) {
      if (error instanceof Error) {
        setDeleteErrorMessage(error.message);
      } else {
        setDeleteErrorMessage("Something went wrong while deleting.");
      }
      setIsDeleting(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex h-40 w-full items-center justify-center bg-stone-50 shadow-md">
        {/* No real thumbnail/preview image exists for a paper's map yet --
            this is intentionally left as a plain blank card, matching the
            mockup exactly. */}
      </div>

      <div className="flex items-center justify-between bg-stone-200 px-3 py-2">
        <span className="line-clamp-2 font-serif text-sm font-semibold text-stone-900">
          {entry.title}
        </span>
        <button
          type="button"
          onClick={handleOptionsButtonClick}
          aria-label="Show options for this paper"
        >
          <Image src="/icons/options.svg" alt="" width={16} height={16} />
        </button>
      </div>

      {isOptionsRowOpen === true && (
        <div className="flex items-center justify-center gap-6 bg-stone-100 py-3">
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
        </div>
      )}

      {isDeleteModalOpen === true && (
        <DeleteConfirmModal
          paperTitle={entry.title}
          onKeep={handleKeepButtonClick}
          onConfirmDelete={handleConfirmDeleteClick}
        />
      )}

      {isDeleting === true && (
        <p className="mt-1 text-center font-serif text-xs text-stone-400">Deleting...</p>
      )}

      {deleteErrorMessage !== null && (
        <p className="mt-1 text-center font-serif text-xs text-[#c1666b]">
          {deleteErrorMessage}
        </p>
      )}
    </div>
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
  useEffect(() => {
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
  }, []);

  // Called by a PaperCard after it successfully deletes itself on the
  // backend -- removes that same entry from THIS list, so the grid
  // updates immediately without needing to re-fetch everything.
  function handlePaperDeleted(deletedId: number) {
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

  function handleFiltersButtonClick() {
    if (isFiltersPanelOpen === true) {
      setIsFiltersPanelOpen(false);
    } else {
      setIsFiltersPanelOpen(true);
    }
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
    <div
      // Extra bottom padding while the Filters dropdown is open. The
      // dropdown is position:absolute, so it doesn't naturally push this
      // container taller -- without this, a tall dropdown pokes out past
      // the bottom edge of this drawer background into whatever's below
      // (bare page background, showing as black). Padding forces this
      // box to actually be tall enough to contain it, and since
      // backgroundSize "cover" is recalculated against this box's real
      // height, the drawer art extends to cover that space too.
      className={
        isFiltersPanelOpen === true
          ? "bg-[#2a2117] px-8 pt-8 pb-72"
          : "bg-[#2a2117] px-8 py-8"
      }
      style={{ backgroundImage: "url(/background/drawer.png)", backgroundSize: "cover" }}
    >
      {/* This inner wrapper is what actually shifts the section to the
          right: a fixed max width plus ml-auto (an "automatic" left
          margin) makes the block hug the right edge of the outer div
          instead of stretching across the whole page. */}
      <div className="w-full px-10">
        <div className="mb-6 flex items-center justify-between pt-5">
          <h2 className="font-serif text-xl font-bold text-stone-100">Previous Papers</h2>

          <div className="relative">
            <button
              type="button"
              onClick={handleFiltersButtonClick}
              className="flex items-center gap-2 rounded-sm bg-stone-200 px-4 py-2 font-serif font-semibold text-stone-900"
            >
              Filters
              <Image src="/icons/filter.svg" alt="" width={16} height={16} />
            </button>

            {isFiltersPanelOpen === true && (
              <div className="absolute right-0 z-40 mt-2">
                <FiltersPanel
                  availableFilterTags={availableFilterTags}
                  selectedFilterTags={selectedFilterTags}
                  onToggleFilterTag={handleToggleFilterTag}
                  onClose={() => setIsFiltersPanelOpen(false)}
                />
              </div>
            )}
          </div>
        </div>

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
                You are currently logged in, but you have no history! Upload a pdf to get started.
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
          (isAuthenticated === false ) && (
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

        {isLoading === false && isAuthenticated === true && loadErrorMessage === null && visibleEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {visibleEntries.map((entry) => (
              <PaperCard key={entry.id} entry={entry} onDeleted={handlePaperDeleted} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
