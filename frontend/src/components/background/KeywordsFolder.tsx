
"use client";

import { useMemo, useState } from "react";
import {
  DocumentImage,
  HistoryEntry,
  KeywordSummary,
  RelatedInfoSummary,
} from "@/lib/types";
import { backendAssetUrl } from "@/lib/api";

interface KeywordsFolderProps {
  entry: HistoryEntry;
}

function collectFallbackKeywords(entry: HistoryEntry): KeywordSummary[] {
  const seenLowercase = new Set<string>();
  const keywords: KeywordSummary[] = [];

  for (const node of entry.map_json.nodes) {
    const terms = [...(node.metadata?.related_terms ?? []), ...(node.metadata?.tags ?? [])];

    for (const term of terms) {
      const trimmed = term.trim();
      if (trimmed.length === 0) continue;

      const key = trimmed.toLowerCase();
      if (seenLowercase.has(key)) continue;

      seenLowercase.add(key);
      keywords.push({ term: trimmed, summary: "" });
    }
  }

  return keywords.sort((a, b) => a.term.localeCompare(b.term));
}

function collectKeywords(entry: HistoryEntry): KeywordSummary[] {
  const generatedKeywords = entry.background?.keywords ?? [];
  if (generatedKeywords.length > 0) {
    return [...generatedKeywords].sort((a, b) => a.term.localeCompare(b.term));
  }

  const supabaseKeywords = entry.keywords ?? [];
  if (supabaseKeywords.length > 0) {
    return [...supabaseKeywords]
      .sort((a, b) => a.localeCompare(b))
      .map((term) => ({ term, summary: "" }));
  }

  return collectFallbackKeywords(entry);
}

function collectRelatedInfo(entry: HistoryEntry): RelatedInfoSummary[] {
  return entry.background?.related_info ?? entry.background?.related_information ?? [];
}

function VocabularyCard({ item }: { item: KeywordSummary }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-2 border border-[#5e503f] bg-[#d9d9d9]">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left font-serif text-[20px] font-normal leading-[26px] text-black"
      >
        <span>{item.term}</span>
        <svg
          width="23"
          height="7"
          viewBox="0 0 23 7"
          fill="none"
          className={isExpanded ? "shrink-0 rotate-180" : "shrink-0"}
          aria-hidden="true"
        >
          <path d="M1 1L11.5 6L22 1" stroke="#5E503F" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {isExpanded === true && (
        <div className="px-4 pb-4">
          <p className="font-serif text-[16px] leading-[21px] text-black">
            {item.summary || "No generated summary was saved for this keyword yet."}
          </p>
        </div>
      )}
    </div>
  );
}

function RelatedInfoCard({ item }: { item: RelatedInfoSummary }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-2 border border-[#5e503f] bg-[#d9d9d9]">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left font-serif text-[20px] font-normal leading-[26px] text-black"
      >
        <span>{item.title}</span>
        <svg
          width="23"
          height="7"
          viewBox="0 0 23 7"
          fill="none"
          className={isExpanded ? "shrink-0 rotate-180" : "shrink-0"}
          aria-hidden="true"
        >
          <path d="M1 1L11.5 6L22 1" stroke="#5E503F" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {isExpanded === true && (
        <div className="px-4 pb-4">
          <p className="font-serif text-[16px] leading-[21px] text-black">
            {item.summary || "No generated summary was saved for this related item yet."}
          </p>
        </div>
      )}
    </div>
  );
}

function ImageCard({ image, index }: { image: DocumentImage; index: number }) {
  const imageTitle = image.file_name ?? `Image ${index + 1}`;
  const imageUrl = backendAssetUrl(image.storage_path);

  return (
    <div className="mb-2 border border-[#5e503f] bg-[#d9d9d9] p-3">
      {imageUrl !== null && (
        <img
          src={imageUrl}
          alt={imageTitle}
          className="mb-3 max-h-48 w-full object-contain"
        />
      )}
      <h3 className="font-serif text-[18px] leading-[24px] text-black">{imageTitle}</h3>
      {image.summary !== undefined && image.summary.trim().length > 0 && (
        <p className="mt-2 font-serif text-[16px] leading-[21px] text-black">
          {image.summary}
        </p>
      )}
      <div className="mt-1 space-y-1 font-serif text-[13px] leading-[17px] text-black">
        {image.page_number !== undefined && <p>Page {image.page_number}</p>}
        {image.image_type !== undefined && <p>Type: {image.image_type}</p>}
        {image.storage_path !== undefined && (
          <p className="break-all">Storage: {image.storage_path}</p>
        )}
      </div>
    </div>
  );
}

function groupByFirstLetter(keywords: KeywordSummary[]): [string, KeywordSummary[]][] {
  const groups = new Map<string, KeywordSummary[]>();

  for (const keyword of keywords) {
    const letter = keyword.term[0].toUpperCase();
    const bucket = groups.get(letter);
    if (bucket !== undefined) {
      bucket.push(keyword);
    } else {
      groups.set(letter, [keyword]);
    }
  }

  return Array.from(groups.entries());
}


const STACK_X = 1643;
const STACK_Y = 1987;
const STACK_WIDTH = 654;
const STACK_HEIGHT = 724;
const STACK_VIEWBOX = `${STACK_X} ${STACK_Y} ${STACK_WIDTH} ${STACK_HEIGHT}`;

type FolderKey = "keywords" | "related" | "images";

interface FolderSpec {
  key: FolderKey;
  label: string;
  path: string;
  color: string;
  labelColor: string;

  topFraction: number;

  labelLeftFraction: number;
}

const FOLDERS: FolderSpec[] = [
  {
    key: "keywords",
    label: "Keywords",
    path: "M2296.75 2466.03L2296.61 2511.73L2173.35 2511.88C1956.85 2512.14 1645.29 2511.95 1644.43 2511.56C1643.69 2511.22 1643.55 2509.23 1643.24 2494.46C1642.65 2466 1643.25 2019.42 1643.89 2015.16C1644.25 2012.8 1644.9 2010.76 1645.69 2009.59C1647.58 2006.77 1649.49 2002.85 1650.94 1998.84C1654.22 1989.78 1657.44 1988.67 1682.99 1987.87C1708.43 1987.07 1818.84 1986.67 1832.89 1987.33C1855.71 1988.4 1858.32 1989.38 1862.58 1998.45C1865.55 2004.76 1867.79 2007.7 1870.7 2009.09L1873.04 2010.21L2000.06 2009.91C2069.93 2009.74 2160.51 2009.35 2201.35 2009.03C2256.65 2008.6 2276.33 2008.6 2278.4 2009.03C2283.4 2010.05 2286.57 2013.37 2289.97 2021.14C2291.12 2023.77 2292.76 2026.79 2293.62 2027.84C2295.77 2030.49 2296.05 2031.76 2296.61 2041.79C2297.06 2049.67 2297.14 2328.99 2296.75 2466.03Z",
    color: "#927E67",
    labelColor: "#D9D9D9",
    topFraction: 0,
    labelLeftFraction: 0.08,
  },
  {
    key: "related",
    label: "Related Info",
    path: "M2295.71 2610.11C2078.71 2609.34 1861.49 2612.59 1644.54 2609.94C1641.47 2608.54 1643.92 2141.44 1644.01 2140.73C1645.45 2128.71 1655.07 2112.67 1666.16 2108.56C1669.17 2107.45 1858.68 2108.44 1858.72 2108.38C1860.56 2105.57 1862.42 2101.75 1863.84 2097.82C1867.11 2088.78 1870.33 2087.67 1895.84 2086.87C1921.23 2086.07 2031.47 2085.67 2045.51 2086.33C2068.29 2087.4 2070.89 2088.37 2075.15 2097.43C2078.11 2103.74 2080.03 2108.02 2083.25 2108.06C2121.75 2108.57 2264.33 2105.29 2277.53 2108C2282.6 2109.04 2294.58 2120.66 2295.71 2140.73C2296.02 2297.19 2296.17 2453.65 2295.71 2610.11Z",
    color: "#C4AB8E",
    labelColor: "#5e503f",
    topFraction: (2086 - STACK_Y) / STACK_HEIGHT,
    labelLeftFraction: 0.43,
  },
  {
    key: "images",
    label: "Images",
    path: "M1643.25 2666.03L1643.39 2711.73L1766.65 2711.88C1983.15 2712.14 2294.71 2711.95 2295.57 2711.56C2296.31 2711.22 2296.45 2709.23 2296.76 2694.46C2297.35 2666 2296.75 2219.42 2296.11 2215.16C2295.75 2212.8 2295.1 2210.76 2294.31 2209.59C2292.42 2206.77 2290.51 2202.85 2289.06 2198.84C2285.78 2189.78 2282.56 2188.67 2257.01 2187.87C2231.57 2187.07 2121.16 2186.67 2107.11 2187.33C2084.29 2188.4 2081.68 2189.38 2077.42 2198.45C2074.45 2204.76 2072.21 2207.7 2069.3 2209.09L2066.96 2210.21L1939.94 2209.91C1870.07 2209.74 1779.49 2209.35 1738.65 2209.03C1683.35 2208.6 1663.67 2208.6 1661.6 2209.03C1656.6 2210.05 1653.43 2213.37 1650.03 2221.14C1648.88 2223.77 1647.24 2226.79 1646.38 2227.84C1644.23 2230.49 1643.95 2231.76 1643.39 2241.79C1642.94 2249.67 1642.86 2528.99 1643.25 2666.03Z",
    color: "#927E67",
    labelColor: "#D9D9D9",
    topFraction: (2187 - STACK_Y) / STACK_HEIGHT,
    labelLeftFraction: 0.78,
  },
];

const OPEN_FOLDER_PUSH_PERCENT = 44;

export function KeywordsFolder({ entry }: KeywordsFolderProps) {
  const [activeTab, setActiveTab] = useState<FolderKey | null>(null);

  const keywords = useMemo(() => collectKeywords(entry), [entry]);
  const groupedKeywords = useMemo(() => groupByFirstLetter(keywords), [keywords]);
  const relatedInfo = useMemo(() => collectRelatedInfo(entry), [entry]);
  const images = entry.images ?? entry.background?.images ?? [];
  const activeFolderIndex = FOLDERS.findIndex((folder) => folder.key === activeTab);

  return (
    <div
      className="relative w-full shrink-0"
      style={{ maxWidth: "42rem", aspectRatio: `${STACK_WIDTH} / ${STACK_HEIGHT}` }}
    >
      {FOLDERS.map((folder, index) => {
        const isActive = activeTab === folder.key;
        const isBelowActiveFolder = activeFolderIndex !== -1 && index > activeFolderIndex;
        const pushedTranslatePercent = isBelowActiveFolder ? OPEN_FOLDER_PUSH_PERCENT : 0;
        const activeContentBottomPadding =
          activeFolderIndex !== -1 ? `${(FOLDERS.length - activeFolderIndex - 1) * 9}rem` : undefined;
        const nextFolder = FOLDERS[index + 1];
        const closedHeightPercent =
          nextFolder !== undefined ? (nextFolder.topFraction - folder.topFraction) * 100 : undefined;

        return (
          <div
            key={folder.key}
            className="pointer-events-none absolute inset-0 transition-transform duration-500 ease-out"
            style={{
              transform: `translateY(${pushedTranslatePercent}%)`,
              zIndex: isBelowActiveFolder ? 30 + index : isActive ? 10 : index,
            }}
          >
            <svg viewBox={STACK_VIEWBOX} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <path d={folder.path} fill={folder.color} />
            </svg>

            <div
              className="pointer-events-auto absolute inset-x-3 overflow-hidden rounded-sm transition-[bottom,height] duration-500 ease-out"
              style={{
                top: `${folder.topFraction * 100}%`,
                bottom: isActive || closedHeightPercent === undefined ? "0.75rem" : undefined,
                height: isActive || closedHeightPercent === undefined ? undefined : `${closedHeightPercent}%`,
              }}
            >
              {isActive === false && (
                <button
                  type="button"
                  onClick={() => setActiveTab(folder.key)}
                  aria-label={`Open ${folder.label} folder`}
                  className="flex h-full w-full cursor-pointer items-start justify-start pt-4 font-serif text-[20px] font-normal leading-[26px]"
                  style={{ color: folder.labelColor, paddingLeft: `${folder.labelLeftFraction * 100}%` }}
                >
                  {folder.label}
                </button>
              )}

              {isActive === true && (
                <div className="flex h-full w-full flex-col text-left">
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    aria-label={`Close ${folder.label} folder`}
                    className="flex cursor-pointer items-start justify-start pt-4 font-serif text-[20px] font-normal leading-[26px]"
                    style={{ color: folder.labelColor, paddingLeft: `${folder.labelLeftFraction * 100}%` }}
                  >
                    {folder.label}
                  </button>

                  <div
                    className="mt-4 min-h-0 flex-1 overflow-y-auto bg-[#d9d9d9] pt-4"
                    style={{ paddingBottom: activeContentBottomPadding }}
                  >
                    {folder.key === "keywords" && (
                      keywords.length === 0 ? (
                        <p className="px-6 py-3 font-serif text-base text-[#5e503f]">
                          No keywords found for this paper.
                        </p>
                      ) : (
                        groupedKeywords.map(([letter, terms]) => (
                          <div key={letter} className="px-6 pt-3">
                            <div className="mb-2 bg-[#5e503f] px-2 py-1 font-serif text-base font-semibold text-[#d9d9d9]">
                              {letter}
                            </div>
                            {terms.map((keyword) => (
                              <VocabularyCard key={keyword.term} item={keyword} />
                            ))}
                          </div>
                        ))
                      )
                    )}

                    {folder.key === "related" && (
                      relatedInfo.length === 0 ? (
                        <p className="px-6 py-3 font-serif text-base text-[#5e503f]">
                          No related info found for this paper.
                        </p>
                      ) : (
                        <div className="px-6 pt-3">
                          {relatedInfo.map((item) => (
                            <RelatedInfoCard key={item.title} item={item} />
                          ))}
                        </div>
                      )
                    )}

                    {folder.key === "images" && (
                      images.length === 0 ? (
                        <p className="px-6 py-3 font-serif text-base text-[#5e503f]">
                          No extracted images found for this paper.
                        </p>
                      ) : (
                        <div className="px-6 pt-3">
                          {images.map((image, index) => (
                            <ImageCard
                              key={`${image.storage_path ?? image.file_name ?? "image"}-${index}`}
                              image={image}
                              index={index}
                            />
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
