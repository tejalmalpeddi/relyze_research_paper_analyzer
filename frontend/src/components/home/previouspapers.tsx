"use client";

import PaperPreview from "@/components/home/paperpreview";
import Filters from "@/components/home/filters";
import useScrollJack from "@/components/home/scrolljack";

export default function PreviousPapers() {
const listRef = useScrollJack();

  return (
    <section className="p-15 pt-0">
      <header className="sticky top-[5%] flex justify-between">
        <h2 className="text-white pt-[2rem]">Previous Papers</h2>
        <Filters/>
      </header>

      <ul
        ref={listRef}
        className="h-[80vh] flex flex-wrap content-start gap-4 overflow-hidden p-4 scrollbar-hidden"
      >
        {/* TODO: populate upon paper upload*/}
        <PaperPreview title="Paper 1" />
        <PaperPreview title="Paper 2" />
        <PaperPreview title="Paper 3" />
        <PaperPreview title="Paper 1" />
        <PaperPreview title="Paper 2" />
        <PaperPreview title="Paper 3" />
      </ul>
    </section>
  );
}
