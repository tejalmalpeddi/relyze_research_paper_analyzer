// lib/types.ts
//
// This file has NO logic in it at all -- no functions that DO anything.
// It only describes SHAPES of data, using TypeScript's "interface" and
// "type" keywords. Nothing here runs when the app runs; it only exists so
// that your code editor (and the TypeScript checker) can catch a typo'd
// or missing field before you ever click save, by comparing your actual
// objects against the shapes written here.
//
// These shapes are hand-written to match backend/schemas.py exactly. If
// someone changes a field over there, this file has to be updated by
// hand to match -- there's no automatic syncing between the two.

// One node in a mind map's tree, exactly as it's stored inside a saved
// paper's map_json.nodes array. See docs/map_json_example.json for a full
// worked example with real content.
export interface MapNode {
  // A short, unique-within-this-map nickname for this node. Edges point
  // at nodes using this id -- it has no meaning beyond "a label to match
  // against."
  id: string;

  // Tells React Flow which visual component to draw this node with. Our
  // MindMap.tsx registers exactly one type, "paper", so this should
  // always be that exact string for every node your teammates' pipeline
  // produces.
  type: string;

  // The actual content shown on the card.
  data: {
    // The text shown at the top of the card.
    title: string;

    // Optional list of short strings shown in the card's description
    // panel when the user clicks its bottom chevron to expand it. Marked
    // optional (the "?") because older or incomplete map_json might not
    // include it at all. This is a fallback for nodes with no `content`
    // below (currently just the root node) -- everything else prefers
    // `content[level]` so the description can change with the difficulty
    // toggle.
    bullets?: string[];
  };

  // The same explanation written at three difficulty levels, produced by
  // the subcategory-generation pipeline (see
  // backend/app/schemas/subcategories.py's ContentLevels). Optional because the
  // root node doesn't have one -- only `data.bullets` above. This is what the
  // Beginner/Intermediate/ Advanced toggle in MindMap.tsx switches between.
  content?: {beginner: string; intermediate: string; advanced: string;};

  // Extra per-node facts from the NLP/LLM pipeline (see pipeline.py's
  // build_map_json). Optional because the root node doesn't have one.
  // Only the fields actually used on the frontend are declared here --
  // the real object also carries source_text, source_page, importance,
  // prerequisites, params, and confidence, which nothing reads yet.
  metadata?: {related_terms?: string[]; tags?: string[];};
}

// One line connecting two nodes, exactly as stored inside a saved paper's
// map_json.edges array.
export interface MapEdge {
  // A unique nickname for this one edge (not really used for anything
  // except being a required, unique React key when the edges are drawn).
  id: string;

  // The id of the node this line starts FROM (the parent).
  source: string;

  // The id of the node this line points TO (the child).
  target: string;
}

// The whole tree for one paper, stored as a single JSON blob in Supabase's
// map_json column. Just two flat lists -- nodes and edges -- connected to
// each other purely by matching id strings, not by nesting.
export interface MapJson {
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface KeywordSummary {
  term: string;
  summary: string;
}

export interface RelatedInfoSummary {
  title: string;
  summary: string;
}

export interface BackgroundContent {
  title?: string;
  keywords?: KeywordSummary[];
  key_terms?: string[];
  related_info?: RelatedInfoSummary[];
  related_information?: RelatedInfoSummary[];
  images?: DocumentImage[];
  source_pages?: number[];
}

export interface DocumentImage {
  page_number?: number;
  image_type?: string;
  file_name?: string;
  storage_path?: string;
  content_type?: string;
  summary?: string;
}

// One full row as it comes back from the backend -- this is exactly what
// GET /history and GET /history/search hand back, and exactly what gets
// passed around the app once a paper has been fetched.
export interface HistoryEntry {
  // A UUID string from the documents table.
  id: string;

  // An ISO-formatted date-time string, e.g. "2026-07-08T15:06:30+00:00".
  created_at: string;

  // The paper's title, shown on its card and in the Mind Map page header.
  title: string;

  // The whole tree for this paper -- see MapJson above.
  map_json: MapJson;

  // Short text tags used by the Filters panel on the homepage, e.g.
  // ["nlp", "transformers"].
  filters: string[];

  keywords?: string[];
  related_info?: string | null;
  images?: DocumentImage[];
  background?: BackgroundContent | null;
}

// The shape needed to CREATE a new history row (used by createHistory in
// lib/api.ts). Notice there's no "id" field here at all -- Supabase
// assigns that automatically the moment the row is inserted, so it would
// make no sense for the frontend to try to supply one.
export interface HistoryCreatePayload {
  title: string;
  map_json: MapJson;
  filters: string[];

  // Optional -- if you don't supply this, the backend fills in "right
  // now" automatically (see backend/schemas.py's HistoryCreate).
  created_at?: string;
}

export interface StickyNotePayload {
  color: string;
  content: string;
  position_x: number;
  position_y: number;
  created_at?: string;
}

export interface StickyNoteEdit {
  id: string;
  color?: string;
  content?: string;
  position_x?: number;
  position_y?: number;
}

export interface StickyNoteEntry {
  id: string | number;
  color: string;
  content: string;
  position_x: number;
  position_y: number;
}

// One page's worth of plain text, as PyMuPDF extracted it -- part of
// DocumentEntry.raw_text.pages below.
export interface RawTextPage {
  page_number: number;
  text: string;
}

// The FULL row from the "documents" table, as GET /documents,
// /documents/latest, and /documents/{id} hand back -- unlike
// HistoryEntry above (which GET /history returns, deliberately trimmed
// down to just the mind-map-relevant fields), this one carries the
// paper's actual text. Used by the Interactive Paper page.
export interface DocumentEntry {
  id: string;
  created_at: string;
  user_id: string;
  file_name: string;

  // A nicer, human-formatted display name the backend derives from
  // file_name (e.g. "Attention Is All You Need" instead of
  // "attentionisallyouneed.pdf") -- prefer this for on-screen labels,
  // falling back to file_name if it's ever empty.
  title: string;

  status: string;

  // Page-by-page plain text (PyMuPDF). Kept on this type since the
  // backend still returns it, but the Interactive Paper page renders
  // markdown_content instead -- raw_text has no paragraph/heading
  // structure, markdown_content does.
  raw_text: {file_name: string; page_count: number; pages: RawTextPage[];};

  // One continuous Markdown string for the whole paper (Docling). This
  // is what the Interactive Paper page actually renders.
  markdown_content: string;

  structured_data: Record<string, unknown>;
}

// One saved highlight -- a run of text within one rendered Markdown
// block, marked at creation time by block_index + character offsets.
// Immutable once created (no "edit," only create/delete) -- see
// createHighlight/deleteHighlight in lib/api.ts.
export interface HighlightEntry {
  id: string;
  document_id: string;
  block_index: number;
  start_offset: number;
  end_offset: number;
  quote: string;
  color: string;
  created_at: string;
}

export interface HighlightPayload {
  block_index: number;
  start_offset: number;
  end_offset: number;
  quote: string;
  color: string;
  created_at?: string;
}

// One point along a freehand pencil stroke. x is a PERCENTAGE (0-100) of
// the paper content's width; y is an absolute pixel offset from the top
// of that same content -- see the comment on StrokeEntry.points for why
// these two use different units.
export interface StrokePoint {
  x: number;
  y: number;
}

// One saved pencil stroke. Never repositioned once drawn -- the eraser
// deletes a whole stroke (deleteStroke in lib/api.ts), it doesn't move
// or partially trim one.
export interface StrokeEntry {
  id: string;
  document_id: string;

  // x as a percentage keeps strokes correctly aligned regardless of how
  // wide the browser window is (same idea as the paper page's own CSS
  // already uses for text positioning); y as a plain pixel offset from
  // the content's top is what lets a stroke scroll naturally along with
  // the continuous Markdown content instead of needing to be re-anchored
  // to a fixed "page" that no longer exists once pagination is dropped.
  points: StrokePoint[];

  color: string;
  stroke_width: number;
  created_at: string;
}

export interface StrokePayload {
  points: StrokePoint[];
  color: string;
  stroke_width: number;
  created_at?: string;
}

export interface ReferenceEntry {
  id: string;
  title: string;
  markdown_content: string;
}
