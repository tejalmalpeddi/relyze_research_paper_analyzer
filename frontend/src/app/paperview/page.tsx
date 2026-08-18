// app/paperview/page.tsx
//
// Shown at "/paperview". Reached either with a "?id=" query parameter
// (a specific paper -- e.g. from clicking one of the bubbles in
// PaperBubbleBar below) or with none at all, in which case this page
// defaults to whichever paper was uploaded most recently -- same "no id
// -> show the latest one" pattern the Mind Map page already uses.
//
// Three real pieces on this page:
//   1. PaperBubbleBar -- lists every paper the logged-in user has
//      uploaded, lets them switch between them.
//   2. The paper itself, rendered as real Markdown (Docling's
//      markdown_content for the selected document), not the old
//      page-by-page plain text.
//   3. Working highlighter / pencil / eraser tools, saved to the backend
//      per document (highlights + strokes tables).

'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  fetchDocumentById,
  fetchDocumentList,
  fetchLatestDocument,
  fetchHighlights,
  createHighlight,
  deleteHighlight,
  fetchStrokes,
  createStroke,
  deleteStroke,
  ApiError,
} from '@/lib/api';
import { DocumentEntry, HighlightEntry, StrokeEntry, StrokePoint } from '@/lib/types';
import styles from './page.module.css';

// A module-level constant (not created fresh inside the component) so
// react-markdown always sees the exact same array reference across
// re-renders -- a new array reference each render would make it think
// the plugin list changed.
const REMARK_PLUGINS = [remarkGfm];

const difficulties = ['Beginner', 'Intermediate', 'Advanced'] as const;
type Difficulty = (typeof difficulties)[number];

const difficultyIndicatorStyles: Record<Difficulty, CSSProperties> = {
  Beginner: { left: '6px', width: 'calc(33.333333% - 12px)' },
  Intermediate: { left: 'calc(33.333333% - 1.5px)', width: 'calc(33.333333% + 3px)' },
  Advanced: { left: 'calc(66.666667% + 6px)', width: 'calc(33.333333% - 12px)' },
};
const sendIconPath =
  'M10.9203 21.9688C10.6845 21.8957 10.3661 21.6493 10.2389 21.4416C10.1711 21.3309 10.0977 21.1259 10.0741 20.9811C10.037 20.7538 10.0093 17.7594 10.0442 17.7594C10.0676 17.7594 14.6287 19.3366 14.641 19.3489C14.6719 19.38 11.9289 21.7855 11.7603 21.8752C11.5438 21.9904 11.1363 22.0358 10.9203 21.9688ZM19.3579 19.9648C19.2142 19.9279 11.2846 17.191 11.2653 17.1716C11.2512 17.1574 17.7562 9.05109 19.1497 7.34636C19.3056 7.15561 19.4064 7.01619 19.3736 7.03653C19.3409 7.05688 17.0585 9.19166 14.3017 11.7805C11.5449 14.3693 9.27868 16.4874 9.2657 16.4874C9.25272 16.4874 7.9827 16.0537 6.44344 15.5235C3.29381 14.4387 3.35022 14.465 3.10794 13.9654C2.89365 13.5235 3.0063 12.961 3.37597 12.627C3.48187 12.5313 6.80892 10.7521 12.1489 7.93539C16.8801 5.43976 20.9249 3.30836 21.1373 3.19894C21.4813 3.02168 21.5551 3 21.8141 3C22.4809 3 23 3.50474 23 4.15319C23 4.26272 22.4981 7.67979 21.8848 11.7467C21.0387 17.3562 20.7483 19.1852 20.6818 19.3239C20.4557 19.7948 19.8457 20.0901 19.3579 19.9648Z';

// Fixed colors for v1 -- no color-picker UI. Highlighter matches its own
// icon's color; pencil uses a dark graphite tone (distinct from the
// highlighter's reddish one) rather than reusing the pencil icon's
// tip color, which happens to match the highlighter's.
const HIGHLIGHTER_COLOR = '#C1666B';
const PENCIL_COLOR = '#0A0908';
const PENCIL_WIDTH = 2.5;

type ActiveTool = 'none' | 'highlighter' | 'pencil' | 'eraser';

// ---------------------------------------------------------------------------
// Text-offset <-> DOM Range helpers, used for both saving a highlight
// (selection -> offsets) and redrawing one (offsets -> selection). Both
// walk the SAME block element's text nodes in the SAME order, so a
// highlight saved from one always redraws correctly later, regardless of
// how many separate text nodes the block happens to be split into
// (e.g. by bold/italic spans in the middle of a sentence).
// ---------------------------------------------------------------------------

function textOffsetOfPoint(root: Node, targetNode: Node, targetOffset: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node: Node | null;
  while ((node = walker.nextNode()) !== null) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += (node.textContent ?? '').length;
  }
  return offset;
}

function rangeFromTextOffsets(root: Node, startOffset: number, endOffset: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;
  let node: Node | null;
  while ((node = walker.nextNode()) !== null) {
    const length = (node.textContent ?? '').length;
    if (startNode === null && offset + length >= startOffset) {
      startNode = node;
      startNodeOffset = startOffset - offset;
    }
    if (endNode === null && offset + length >= endOffset) {
      endNode = node;
      endNodeOffset = endOffset - offset;
    }
    offset += length;
    if (startNode !== null && endNode !== null) break;
  }
  if (startNode === null || endNode === null) return null;
  const range = document.createRange();
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  return range;
}

// Removes every previously-inserted highlight <mark>, restoring the
// block's text nodes to how react-markdown originally rendered them --
// run before reapplying the full current highlight list, so repeated
// runs never nest or duplicate marks.
function stripHighlightMarks(root: HTMLElement) {
  const marks = root.querySelectorAll('mark[data-highlight-id]');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent === null) return;
    while (mark.firstChild !== null) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

// ---------------------------------------------------------------------------
// PaperBubbleBar -- lists the logged-in user's papers, lets them switch.
// ---------------------------------------------------------------------------

interface PaperBubbleBarProps {
  currentDocumentId: string | null;
}

function PaperBubbleBar({ currentDocumentId }: PaperBubbleBarProps) {
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDocumentList()
      .then((fetchedDocuments) => {
        setDocuments(fetchedDocuments);
        setLoadErrorMessage(null);
        setIsLoggedOut(false);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          setIsLoggedOut(true);
        } else if (error instanceof Error) {
          setLoadErrorMessage(error.message);
        } else {
          setLoadErrorMessage('Something went wrong while loading your papers.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading === true) {
    return (
      <div className={styles.paperSelector}>
        <span className={styles.paperSelectorMessage}>Loading your papers...</span>
      </div>
    );
  }

  if (isLoggedOut === true) {
    return (
      <div className={styles.paperSelector}>
        <span className={styles.paperSelectorMessage}>You are currently logged out, nothing to display!</span>
        <button
          type="button"
          onClick={() => router.push('/profile')}
          className="shrink-0 rounded-sm bg-[#5b4636] px-4 py-1.5 font-serif text-xs font-semibold text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loadErrorMessage !== null) {
    return (
      <div className={styles.paperSelector}>
        <span className={styles.paperSelectorMessage} style={{ color: '#c1666b' }}>
          Couldn&apos;t load your papers: {loadErrorMessage}
        </span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={styles.paperSelector}>
        <span className={styles.paperSelectorMessage}>No papers yet -- upload one from the homepage.</span>
      </div>
    );
  }

  return (
    <div className={styles.paperSelector}>
      {documents.map((document) => (
        <Link
          key={document.id}
          href={`/paperview?id=${document.id}`}
          className={styles.paperBubble}
          data-active={document.id === currentDocumentId}
        >
          {document.title || document.file_name}
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar -- now interactive. type indicates which tool this button arms;
// clicking the already-armed tool disarms it back to 'none'.
// ---------------------------------------------------------------------------

function ToolIcon({ type }: { type: 'highlighter' | 'pencil' | 'eraser' }) {
  if (type === 'highlighter') {
    return (
      <svg className={styles.toolIcon} viewBox="0 0 112 72" aria-hidden="true">
        <path d="M66 27H88L98 55H66Z" fill="#C1666B" />
        <path d="M-98 -34C-52 -8 -2 13 42 21V61C-2 69 -52 90 -98 116Z" fill="#535353" />
        <path d="M42 21H48V61H42Z" fill="#535353" />
        <path d="M63 27H67V55H63Z" fill="#535353" />
        <rect x="42" y="21" width="24" height="40" rx="4" fill="#0A0909" />
      </svg>
    );
  }

  if (type === 'pencil') {
    return (
      <svg className={styles.toolIcon} viewBox="0 0 112 56" aria-hidden="true">
        <path d="M-20 0L54 16V40L-20 56Z" fill="#EAE0D5" />
        <path d="M54 16L112 28L54 40Z" fill="#C1666B" />
      </svg>
    );
  }

  return (
    <svg className={styles.toolIcon} viewBox="0 0 93 138" aria-hidden="true">
      <rect x="0" y="0" width="93" height="138" fill="#D9D9D9" />
      <rect x="0" y="0" width="42" height="138" fill="#22333B" />
    </svg>
  );
}

interface ToolsProps {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
}

function Tools({ activeTool, onSelectTool }: ToolsProps) {
  function toggle(tool: ActiveTool) {
    onSelectTool(activeTool === tool ? 'none' : tool);
  }

  return (
    <aside className={styles.tools} aria-label="Paper annotation tools">
      <button
        className={`${styles.toolButton} ${styles.highlighterButton}`}
        type="button"
        aria-label="Highlight"
        data-active={activeTool === 'highlighter'}
        onClick={() => toggle('highlighter')}
      >
        <ToolIcon type="highlighter" />
      </button>
      <button
        className={`${styles.toolButton} ${styles.pencilButton}`}
        type="button"
        aria-label="Draw"
        data-active={activeTool === 'pencil'}
        onClick={() => toggle('pencil')}
      >
        <ToolIcon type="pencil" />
      </button>
      <button
        className={styles.eraserButton}
        type="button"
        aria-label="Erase"
        data-active={activeTool === 'eraser'}
        onClick={() => toggle('eraser')}
      >
        <ToolIcon type="eraser" />
      </button>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// PaperContentView -- the real paper: markdown, toolbar, highlights,
// strokes. Rendered with key={document.id} by its parent, so switching
// papers via a bubble fully remounts this (fresh tool state, fresh
// fetches) instead of trying to reconcile state across two different
// papers.
// ---------------------------------------------------------------------------

interface PaperContentViewProps {
  document: DocumentEntry;
}

function PaperContentView({ document: paperDocument }: PaperContentViewProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>('none');

  const contentRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const blockIndexRef = useRef(0);

  const [highlights, setHighlights] = useState<HighlightEntry[]>([]);
  const [strokes, setStrokes] = useState<StrokeEntry[]>([]);
  const [contentHeight, setContentHeight] = useState(0);

  // A stroke currently being drawn (pointer down but not yet lifted) --
  // local only, not saved until pointer-up.
  const [inProgressStroke, setInProgressStroke] = useState<StrokePoint[] | null>(null);

  useEffect(() => {
    fetchHighlights(paperDocument.id).then(setHighlights).catch(() => setHighlights([]));
    fetchStrokes(paperDocument.id).then(setStrokes).catch(() => setStrokes([]));
  }, [paperDocument.id]);

  // Tracks .paperSheet's real rendered height (NOT .paperContent's --
  // .paperContent has its own padding, so its content-box height would
  // undercount by that padding amount; the SVG overlay is sized via
  // "inset:0" against .paperSheet, so that's the box that has to match).
  // Content is unbounded height (no more fixed per-page size) -- the SVG
  // overlay's viewBox needs this to convert stored percentage/pixel
  // stroke points back into on-screen coordinates correctly.
  useEffect(() => {
    const element = sheetRef.current;
    if (element === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) {
        setContentHeight(entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Redraws every saved highlight as a <mark>, wiping and rebuilding from
  // scratch each time so this never double-wraps -- see
  // stripHighlightMarks's comment. Only depends on the paper's own text
  // and the highlight list itself, NOT on activeTool or anything else,
  // so switching tools doesn't re-trigger this.
  useEffect(() => {
    const root = contentRef.current;
    if (root === null) return;

    stripHighlightMarks(root);

    for (const highlight of highlights) {
      const blockElement = root.querySelector(`[data-block-index="${highlight.block_index}"]`);
      if (blockElement === null) continue;

      // Defensive check: skip (rather than render garbage) if the
      // block's text no longer matches what was highlighted -- see
      // HighlightEntry.quote's comment in lib/types.ts.
      const blockText = blockElement.textContent ?? '';
      if (blockText.slice(highlight.start_offset, highlight.end_offset) !== highlight.quote) {
        continue;
      }

      const range = rangeFromTextOffsets(blockElement, highlight.start_offset, highlight.end_offset);
      if (range === null) continue;

      const mark = window.document.createElement('mark');
      mark.dataset.highlightId = highlight.id;
      mark.style.backgroundColor = highlight.color;
      mark.style.color = 'inherit';
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
    }
  }, [paperDocument.markdown_content, highlights]);

  // Stamps every top-level rendered block with a stable data-block-index,
  // in document order -- this is the anchor highlights are saved against.
  const markdownComponents: Components = useMemo(() => {
    function nextIndex(): number {
      const index = blockIndexRef.current;
      blockIndexRef.current += 1;
      return index;
    }

    return {
      p: ({ node: _node, ...props }) => <p data-block-index={nextIndex()} {...props} />,
      h1: ({ node: _node, ...props }) => <h1 data-block-index={nextIndex()} {...props} />,
      h2: ({ node: _node, ...props }) => <h2 data-block-index={nextIndex()} {...props} />,
      h3: ({ node: _node, ...props }) => <h3 data-block-index={nextIndex()} {...props} />,
      h4: ({ node: _node, ...props }) => <h4 data-block-index={nextIndex()} {...props} />,
      h5: ({ node: _node, ...props }) => <h5 data-block-index={nextIndex()} {...props} />,
      h6: ({ node: _node, ...props }) => <h6 data-block-index={nextIndex()} {...props} />,
      li: ({ node: _node, ...props }) => <li data-block-index={nextIndex()} {...props} />,
      blockquote: ({ node: _node, ...props }) => <blockquote data-block-index={nextIndex()} {...props} />,
    };
  }, []);

  // eslint-disable-next-line react-hooks/refs
  blockIndexRef.current = 0;

  function handleTextSelection() {
    if (activeTool !== 'highlighter') return;
    const selection = window.getSelection();
    if (selection === null || selection.isCollapsed === true) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const containerElement = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement;
    const blockElement = containerElement?.closest('[data-block-index]');
    if (blockElement === null || blockElement === undefined) {
      // Selection spans more than one block (or landed outside any
      // stamped block, e.g. inside a table) -- rejected for this pass,
      // see the plan's explicit scope cut.
      selection.removeAllRanges();
      return;
    }

    const startOffset = textOffsetOfPoint(blockElement, range.startContainer, range.startOffset);
    const endOffset = textOffsetOfPoint(blockElement, range.endContainer, range.endOffset);
    const quote = range.toString();
    const blockIndex = Number(blockElement.getAttribute('data-block-index'));

    selection.removeAllRanges();

    createHighlight(paperDocument.id, {
      block_index: blockIndex,
      start_offset: Math.min(startOffset, endOffset),
      end_offset: Math.max(startOffset, endOffset),
      quote,
      color: HIGHLIGHTER_COLOR,
    })
      .then((savedHighlight) => {
        setHighlights((previous) => [...previous, savedHighlight]);
      })
      .catch(() => {
        // Selection spanning two different formatted runs inside the
        // same block can occasionally produce offsets the backend
        // rejects -- fails silently rather than crashing the page;
        // nothing was saved, so there's nothing to roll back.
      });
  }

  // Erases a highlight -- highlights are rendered as real <mark> elements
  // (inserted directly into the DOM by the redraw effect above, not
  // through normal React JSX), each carrying its own database id in a
  // "data-highlight-id" attribute. Rather than putting a click handler on
  // every individual <mark> (there could be many, and they get
  // recreated every time the redraw effect runs), this listens on the
  // whole content area once and checks what got clicked -- the standard
  // "event delegation" pattern.
  function handleEraserClick(event: React.MouseEvent<HTMLDivElement>) {
    if (activeTool !== 'eraser') return;
    const target = event.target as Element;
    const mark = target.closest('mark[data-highlight-id]');
    if (mark === null) return;

    const highlightId = mark.getAttribute('data-highlight-id');
    if (highlightId === null) return;

    setHighlights((previous) => previous.filter((highlight) => highlight.id !== highlightId));
    deleteHighlight(paperDocument.id, highlightId).catch(() => {
      // If the delete fails server-side, the highlight will simply
      // reappear next time the page reloads and re-fetches -- same
      // tradeoff the stroke eraser makes, see handleStrokeClick below.
    });
  }

  // --- Pencil / eraser: pointer handlers on the SVG overlay ---

  function svgPointFromEvent(event: React.PointerEvent<SVGSVGElement>): StrokePoint | null {
    const svg = svgRef.current;
    if (svg === null || contentHeight === 0) return null;
    const rect = svg.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPixels = event.clientY - rect.top;
    return { x: xPercent, y: yPixels };
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (activeTool !== 'pencil') return;
    const point = svgPointFromEvent(event);
    if (point === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setInProgressStroke([point]);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (activeTool !== 'pencil' || inProgressStroke === null) return;
    const point = svgPointFromEvent(event);
    if (point === null) return;
    setInProgressStroke((previous) => (previous === null ? null : [...previous, point]));
  }

  function handlePointerUp() {
    if (activeTool !== 'pencil' || inProgressStroke === null || inProgressStroke.length < 2) {
      setInProgressStroke(null);
      return;
    }
    const points = inProgressStroke;
    setInProgressStroke(null);
    createStroke(paperDocument.id, {
      points,
      color: PENCIL_COLOR,
      stroke_width: PENCIL_WIDTH,
    })
      .then((savedStroke) => {
        setStrokes((previous) => [...previous, savedStroke]);
      })
      .catch(() => {
        // Stroke just doesn't appear -- nothing was optimistically drawn
        // yet, so there's no state to undo.
      });
  }

  function handleStrokeClick(strokeId: string, event: React.MouseEvent<SVGPathElement>) {
    if (activeTool !== 'eraser') return;
    event.stopPropagation();
    setStrokes((previous) => previous.filter((stroke) => stroke.id !== strokeId));
    deleteStroke(paperDocument.id, strokeId).catch(() => {
      // If the delete fails server-side, the stroke will simply
      // reappear next time strokes are refetched (e.g. on reload) --
      // acceptable for this pass rather than reconciling an optimistic
      // removal that failed.
    });
  }

  function pointsToPath(points: StrokePoint[]): string {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    const startCommand = `M ${first.x} ${first.y}`;
    const lineCommands = rest.map((point) => `L ${point.x} ${point.y}`).join(' ');
    return `${startCommand} ${lineCommands}`;
  }

  return (
    <>
      <section className={styles.paperPanel} aria-label="Paper preview">
        <Tools activeTool={activeTool} onSelectTool={setActiveTool} />
        <div className={styles.paperScroll}>
          <article ref={sheetRef} className={styles.paperSheet}>
            <div
              ref={contentRef}
              className={styles.paperContent}
              onMouseUp={handleTextSelection}
              onClick={handleEraserClick}
              style={{ cursor: activeTool === 'highlighter' ? 'text' : activeTool === 'eraser' ? 'crosshair' : undefined }}
            >
              <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={markdownComponents}>
                {paperDocument.markdown_content}
              </ReactMarkdown>
            </div>
            <svg
              ref={svgRef}
              className={styles.drawLayer}
              viewBox={`0 0 100 ${Math.max(contentHeight, 1)}`}
              preserveAspectRatio="none"
              // Only "auto" while actually drawing (pencil) -- blank areas
              // need to be clickable then, to start a new stroke anywhere.
              // For every other tool (including eraser), this stays "none"
              // so clicks on blank space fall straight through to
              // .paperContent underneath (e.g. to reach a highlight
              // <mark> for erasing) -- each individual stroke <path>
              // below re-enables its OWN pointer-events while eraser is
              // armed, the same "parent none, children opt back in"
              // pattern .tools/.toolButton already use elsewhere on this
              // page.
              style={{ pointerEvents: activeTool === 'pencil' ? 'auto' : 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {strokes.map((stroke) => (
                <path
                  key={stroke.id}
                  d={pointsToPath(stroke.points)}
                  stroke={stroke.color}
                  strokeWidth={stroke.stroke_width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{
                    cursor: activeTool === 'eraser' ? 'pointer' : undefined,
                    pointerEvents: activeTool === 'eraser' ? 'auto' : 'none',
                  }}
                  onClick={(event) => handleStrokeClick(stroke.id, event)}
                />
              ))}
              {inProgressStroke !== null && (
                <path
                  d={pointsToPath(inProgressStroke)}
                  stroke={PENCIL_COLOR}
                  strokeWidth={PENCIL_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          </article>
        </div>
      </section>
      <section className={styles.corkPanel} aria-label="Interactive paper workspace">
        <Image alt="" className={styles.corkboardImage} src="/background/corkboard.jpg" fill sizes="50vw" priority />
        <InsightPanel />
        <BottomChatBar />
      </section>
    </>
  );
}

function DifficultySelect() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [hoveredDifficulty, setHoveredDifficulty] = useState<Difficulty | null>(null);
  const hoverDifficulty = hoveredDifficulty ?? difficulty;

  return (
    <div className={styles.difficultySelect} aria-label="Difficulty preference">
      <span className={styles.difficultyTrack} />
      <span
        className={styles.difficultyHoverIndicator}
        data-visible={hoveredDifficulty !== null && hoveredDifficulty !== difficulty}
        style={difficultyIndicatorStyles[hoverDifficulty]}
      />
      <span className={styles.difficultyIndicator} data-difficulty={difficulty} />
      {difficulties.map((level) => (
        <button
          key={level}
          className={styles.difficultyButton}
          type="button"
          data-active={difficulty === level}
          onMouseEnter={() => setHoveredDifficulty(level)}
          onMouseLeave={() => setHoveredDifficulty(null)}
          onFocus={() => setHoveredDifficulty(level)}
          onBlur={() => setHoveredDifficulty(null)}
          onClick={() => setDifficulty(level)}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

function InsightPanel() {
  return (
    <aside className={styles.insightPanel} aria-label="Paper assistant">
      <div className={styles.userMessage}>This is a chat message from the user.</div>
      <div className={styles.answerCard}>
        Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem
        placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar
        vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere.
        Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.
      </div>
    </aside>
  );
}

function BottomChatBar() {
  const [chatMessage, setChatMessage] = useState('');
  const [isSendActive, setIsSendActive] = useState(false);

  function sendMessage() {
    if (chatMessage.trim()) {
      setChatMessage('');
    }
  }

  return (
    <section className={styles.bottomChatBar} aria-label="Paper assistant controls">
      <Image alt="" className={styles.bottomWoodImage} src="/background/wood.png" fill sizes="50vw" />
      <div className={styles.bottomControls}>
        <label className={styles.chatInputWrap}>
          <span className={styles.srOnly}>Ask about this paper</span>
          <input
            className={styles.chatInput}
            type="text"
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                sendMessage();
              }
            }}
          />
        </label>
        <div className={styles.bottomActionRow}>
          <DifficultySelect />
          <button
            className={styles.sendButton}
            type="button"
            aria-label="Send message"
            data-active={isSendActive}
            onClick={sendMessage}
            onMouseEnter={() => setIsSendActive(true)}
            onMouseLeave={() => setIsSendActive(false)}
            onMouseDown={() => setIsSendActive(true)}
            onMouseUp={() => setIsSendActive(false)}
          >
            <svg className={styles.sendIcon} fill="none" height="25" viewBox="0 0 26 25" width="26" aria-hidden="true">
              <path d={sendIconPath} />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

interface PaperLoadState {
  requestKey: string | null | undefined;
  matchedDocument: DocumentEntry | null;
  loadErrorMessage: string | null;
}

function PaperViewPageContent() {
  const searchParams = useSearchParams();
  const requestedIdText = searchParams.get('id');

  const [loadState, setLoadState] = useState<PaperLoadState>({
    requestKey: undefined,
    matchedDocument: null,
    loadErrorMessage: null,
  });
  const isLoading = loadState.requestKey !== requestedIdText;
  const matchedDocument = loadState.matchedDocument;
  const loadErrorMessage = loadState.loadErrorMessage;

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchPromise = requestedIdText !== null ? fetchDocumentById(requestedIdText) : fetchLatestDocument();

    fetchPromise
      .then((fetchedDocument) => {
        if (isCurrentRequest === true) {
          setLoadState({ requestKey: requestedIdText, matchedDocument: fetchedDocument, loadErrorMessage: null });
        }
      })
      .catch(() => {
        if (isCurrentRequest === true) {
          setLoadState({ requestKey: requestedIdText, matchedDocument: null, loadErrorMessage: null });
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [requestedIdText]);

  let notFoundMessage: string;
  if (requestedIdText !== null) {
    notFoundMessage = `No paper found with id "${requestedIdText}".`;
  } else {
    notFoundMessage = 'No papers uploaded yet -- upload one from the homepage to get started.';
  }

  return (
    <main className={styles.page}>
      <PaperBubbleBar currentDocumentId={requestedIdText} />

      {isLoading === true && (
        <div className={`${styles.messageArea} flex items-center justify-center bg-[#17181a] font-serif text-stone-400`}>
          Loading...
        </div>
      )}

      {isLoading === false && loadErrorMessage !== null && (
        <div className={`${styles.messageArea} flex items-center justify-center bg-[#17181a] font-serif text-[#c1666b]`}>
          Couldn&apos;t load this paper: {loadErrorMessage}
        </div>
      )}

      {isLoading === false && loadErrorMessage === null && matchedDocument === null && (
        <div className={`${styles.messageArea} flex items-center justify-center bg-[#17181a] font-serif text-stone-400`}>
          {notFoundMessage}
        </div>
      )}

      {matchedDocument !== null && (
        <div className={styles.content}>
          <PaperContentView key={matchedDocument.id} document={matchedDocument} />
        </div>
      )}
    </main>
  );
}

export default function PaperViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#17181a] font-serif text-stone-400">
          Loading...
        </div>
      }
    >
      <PaperViewPageContent />
    </Suspense>
  );
}
