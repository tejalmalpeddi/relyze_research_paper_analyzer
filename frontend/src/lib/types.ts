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
    // include it at all.
    bullets?: string[];
  };
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

// One full row as it comes back from the backend -- this is exactly what
// GET /history and GET /history/search hand back, and exactly what gets
// passed around the app once a paper has been fetched.
export interface HistoryEntry {
  // A whole-number id, auto-assigned by Postgres when the row was first
  // created. NOT a string -- this bit us once already (see the very
  // first conversation about this codebase), so it's worth remembering.
  id: number;

  // An ISO-formatted date-time string, e.g. "2026-07-08T15:06:30+00:00".
  created_at: string;

  // The paper's title, shown on its card and in the Mind Map page header.
  title: string;

  // The whole tree for this paper -- see MapJson above.
  map_json: MapJson;

  // Short text tags used by the Filters panel on the homepage, e.g.
  // ["nlp", "transformers"].
  filters: string[];
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
