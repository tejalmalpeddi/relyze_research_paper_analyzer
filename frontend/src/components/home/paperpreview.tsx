// components/home/paperpreview.tsx
//
// One single card in the "Previous Papers" grid. This is your
// teammate's PaperCard from History.tsx, carried over wholesale (per
// your call in the merge conversation) -- same backend wiring, same
// delete/redirect logic, same visual styling. Renamed PaperPreview only
// so the import in PreviousPapers.tsx ("PaperPreview from
// @/components/home/paperpreview") matches what's actually exported.
//
// Owns two small pieces of local state: whether its own options row
// (trash / redirect / rename) is currently showing, and whether its own
// delete-confirmation modal is currently showing. Neither needs to be
// known by any other card or by the parent grid.

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HistoryEntry } from "@/lib/types";
import { deleteHistory } from "@/lib/api";

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
// the SVG file.
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
// PaperPreview
// ---------------------------------------------------------------------
interface PaperPreviewProps {
  entry: HistoryEntry;
  onDeleted: (deletedId: number) => void;
}

export default function PaperPreview({ entry, onDeleted }: PaperPreviewProps) {
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

  // NOTE: This just opens/closes the plain "are you sure" modal for now.
  // You mentioned you're building a proper confirmation popup -- when
  // that's ready, swap the isDeleteModalOpen block below for it. The
  // handlers it needs (handleConfirmDeleteClick / handleKeepButtonClick)
  // are already here and won't need to change.
  function handleKeepButtonClick() {
    setIsDeleteModalOpen(false);
  }

  // Sends the user to the Mind Map page, passing along WHICH paper to
  // show via a "?id=" query parameter on the URL.
  function handleRedirectButtonClick() {
    router.push(`/mindmap?id=${entry.id}`);
  }

  // Not implemented yet -- there's no backend route for renaming a saved
  // paper's title. Left as a visible but non-functional button, matching
  // the mockup, rather than silently pretending it works.
  function handleRenameButtonClick() {
    // Intentionally does nothing right now.
  }

  async function handleConfirmDeleteClick() {
    setIsDeleting(true);
    setDeleteErrorMessage(null);
    try {
      await deleteHistory(entry.id);
      // Tell the parent grid to drop this card from the list it's
      // showing -- see PreviousPapers's handlePaperDeleted.
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

      {/* TODO: swap this for your in-progress delete-confirmation popup.
          Handlers (onKeep / onConfirmDelete) are already wired below and
          shouldn't need to change when you drop the new component in. */}
      {isDeleteModalOpen === true && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[420px] rounded-sm border border-stone-400 bg-stone-100 p-8 text-center shadow-2xl">
            <p className="mb-6 font-serif text-lg text-stone-900">
              Are you sure you want to delete &quot;{entry.title}&quot;?
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleKeepButtonClick}
                className="rounded-sm bg-[#5b4636] px-6 py-2 font-serif text-white"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClick}
                className="rounded-sm bg-[#c1666b] px-6 py-2 font-serif text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
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
