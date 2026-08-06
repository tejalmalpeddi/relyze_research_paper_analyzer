// components/home/filters.tsx
//
// Same visual styling as your original version -- torn-paper dropdown,
// off-white toggle button, native checkboxes. The only real change:
// the filter tag list and each checkbox's checked state now come from
// PreviousPapers (the parent), which reads them from the fetched paper
// entries, instead of the hardcoded `options` array. That's what makes
// checking a box actually filter the grid, the same way it does in
// History.tsx.
//
// The dropdown's own open/closed state (`expanded`) stays local here --
// nothing outside this component needs to know whether the panel is
// currently showing.

"use client";

import { useState } from "react";

interface FiltersProps {
  availableFilterTags: string[];
  selectedFilterTags: Set<string>;
  onToggleFilterTag: (tag: string) => void;
}

export default function Filters({
  availableFilterTags,
  selectedFilterTags,
  onToggleFilterTag,
}: FiltersProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <form className="relative inline-flex flex-col w-[50%] max-w-[300px]">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center justify-between bg-off-white p-4"
      >
        <h2>Filters</h2>
        <img src="/icons/filter.svg" alt="Filter icon" className="size-8 object-contain" />
      </button>

      {expanded && (
        <div className="absolute top-[100%] drop-shadow-lg/50">
          <ul className="bg-white px-4 pt-2 pb-4">
            {availableFilterTags.length === 0 ? (
              <li className="my-2 text-sm text-stone-500">No filters yet.</li>
            ) : (
              availableFilterTags.map((tag) => (
                <li key={tag}>
                  <label className="w-full inline-flex items-center gap-3 my-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 focus:ring-black"
                      checked={selectedFilterTags.has(tag)}
                      onChange={() => onToggleFilterTag(tag)}
                    />
                    <span>{tag}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
          <img src="/interface/torn-paper.svg" alt="Torn paper" />
        </div>
      )}
    </form>
  );
}
