"use client";

import { useState } from "react";


{/* TODO: replace these filler options with ones generated from the papers */}
const options = [
  "Source",
  "Date",
  "Category",
  "Status",
];

export default function Filters() {
  const [expanded, setExpanded] = useState(false);

  return (
    <form className="inline-flex flex-col w-[50%] max-w-[300px]">
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
          {options.map((option) => (
            <li key={option}>
              <label className="w-full inline-flex items-center gap-3 my-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 focus:ring-black" />
                <span>{option}</span>
              </label>
            </li>
          ))}
          </ul>
          <img src="/interface/torn-paper.svg" alt="Torn paper"/>
        </div>
      )}
    </form>
  );
}
