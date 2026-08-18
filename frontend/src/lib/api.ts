// lib/api.ts
//
// This is the ONLY file in the whole frontend that's allowed to call
// fetch() and talk to the backend over the network. Every other file that
// needs data from the backend imports one of the functions below instead
// of calling fetch() itself -- that way, if the backend's address or
// error format ever changes, there's exactly one file to update.
//
// Every function here follows the same three-step pattern:
//   1. Build the full URL (API_URL + the specific route).
//   2. Call fetch() and wait for the response.
//   3. Hand the response through handleResponse(), which turns it into
//      either real data or a thrown Error, depending on whether the
//      backend reported success or failure.

// Every single exported function in that file follows the identical pattern: 
// build a URL matching one specific backend route, send the request, 
// hand the raw response through handleResponse for parsing/error-checking. 

import {
  HistoryCreatePayload,
  HistoryEntry,
  StickyNotePayload,
  StickyNoteEdit,
  StickyNoteEntry,
  DocumentEntry,
  HighlightEntry,
  HighlightPayload,
  StrokeEntry,
  StrokePayload,
  ReferenceEntry
} from "./types";
//generic type ^^ later comes in to play 

// Where the backend actually lives. NEXT_PUBLIC_API_URL can be set in a
// .env.local file to point at a different backend (e.g. a deployed one)
// without changing this file at all. If it's not set, we assume you're
// running the backend locally with `uvicorn main:app` on its default port.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function backendAssetUrl(path: string | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${API_URL}${path}`;
  return `${API_URL}/${path}`;
}

// A regular Error, plus the HTTP status code that caused it. Callers
// (like History.tsx) can check err.status === 401 to tell "you're not
// logged in" apart from every other kind of failure, without having to
// parse the message text to guess.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Turns a raw fetch() Response into either the parsed data (on success)
// or a thrown ApiError with a readable message (on failure). FastAPI's
// error shape is handled here -- raised HTTPExceptions (including the
// 401s that verify_cookie raises when there's no valid login) come back
// as { "detail": "some message string" }.

//async means "this function is allowed to use await inside it,
// and automatically wraps whatever it returns in a Promise"

//before .json() runs, the response is an untranslated envelope containing raw
// text that's expected — but not guaranteed — to be JSON-formatted.
// .json() is the actual act of opening it and turning it into something your code can work with.
async function handleResponse<ExpectedShape>(
  response: Response //actual input is "Response" aka built in browser type w raw network reply
): Promise<ExpectedShape> { //generic type
  if (response.ok === false) {
    //"Try to translate the envelope's contents as JSON — but if that translation itself
    // fails (because what's inside isn't actually JSON), don't crash; just treat it as null
    // (nothing useful inside) instead."
    const errorBody = await response.json().catch(() => null);

    let errorMessage: string;
    if (errorBody !== null && typeof errorBody.detail === "string") {
      errorMessage = errorBody.detail;
    } else {
      errorMessage = `Request failed with status ${response.status}`;
    }

    throw new ApiError(errorMessage, response.status);
  }

  //.json() is the "open the envelope and translate it" step
  //This is the line that actually converts that raw JSON-formatted text into a real, usable JavaScript 
  // object/array — one you can do .title or .map((x) => ...) on. 
  // Before this line runs, you have an envelope; after it runs, 
  // you have the actual letter, read and understood.

  const parsedData = await response.json();
  return parsedData as ExpectedShape;
}

// GET /history -- every saved paper, full data including map_json.
// Used by the homepage's "Previous Papers" section. No longer used by
// the Mind Map page at all -- looking up one specific clicked-into paper
// calls fetchHistoryById (GET /history/{id}), and showing the most
// recently saved paper calls fetchLatestHistory (GET /history/latest),
// so neither case needs to download the whole list anymore.

// entire job of this function is to build the right url, send the request, 
// and hand the raw response to the shared parsing logic: handleResponse
// this function is the waiter that doesn't cook anything, just carries the order to the kitchen
// and gets the result back

// frontend: fetch(`${API_URL}/history`)   → sends a request to the path "/history"
// backend: @app.get("/history")         → registered to respond to the path "/history"
export async function fetchHistoryList(): Promise<HistoryEntry[]> {
  //await fetch sends network request to localhost/history (the backend)
  //essentially, await fetch function is a get request which arrives to backend.
  //backend told: any get request whose path is exactly /history, run history_get()
  //
  //credentials: "include" is the part that actually attaches your login
  //cookie to this request. Without it, the browser sends the request
  //with NO cookie at all -- fetch() doesn't include cookies by default
  //for a request going to a different port (3000 -> 8000 counts as
  //"different"), so every route protected by verify_cookie would 401
  //even for someone who's genuinely logged in.
  const response = await fetch(`${API_URL}/history`, { credentials: "include" });
  return handleResponse<HistoryEntry[]>(response);
  //array of history entries ^
}

// GET /history/search?title=... -- one entry, found by an EXACT title
// match (not a partial/fuzzy search). Not currently used anywhere in the
// app yet, but kept here since the backend route exists and works.
export async function fetchHistoryByTitle(title: string): Promise<HistoryEntry> {
  const response = await fetch(
    `${API_URL}/history/search?title=${encodeURIComponent(title)}`,
    { credentials: "include" }
  );
  return handleResponse<HistoryEntry>(response);
}

// GET /history/{id} -- one entry, found by its exact numeric id. Used by
// the Mind Map page when it's reached via a specific paper's "redirect"
// button, so it can ask the backend for exactly that one row instead of
// downloading every saved paper and searching through them here.
export async function fetchHistoryById(id: string): Promise<HistoryEntry> {
  const response = await fetch(`${API_URL}/history/${id}`, { credentials: "include", cache: 'no-store' });
  return handleResponse<HistoryEntry>(response);
}

// GET /history/latest -- one entry, whichever was created most recently.
// Used by the Mind Map page when it's reached via the plain "Mind Map"
// navbar tab (no "?id=" in the URL), so it can ask the backend to sort
// and pick the newest row directly instead of downloading every saved
// paper and comparing created_at timestamps here.
export async function fetchLatestHistory(): Promise<HistoryEntry> {
  const response = await fetch(`${API_URL}/history/latest`, { credentials: "include" , cache: 'no-store'});
  return handleResponse<HistoryEntry>(response);
}

// GET /history/get_title -- a lightweight list of just titles, with no
// map_json attached. Meant for a future autocomplete/search box; not used
// anywhere in the app yet.
export async function fetchHistoryTitles(): Promise<{ title: string }[]> {
  const response = await fetch(`${API_URL}/history/get_title`, { credentials: "include", cache: 'no-store' });
  return handleResponse<{ title: string }[]>(response);
}

// POST /history/create -- save a brand new paper's map. Not called
// anywhere yet either, since the PDF-upload-and-generate pipeline that
// would produce a real map_json to save doesn't exist in this repo yet
// (see the earlier conversation about the "live map" plan). Kept here so
// it's ready the moment that pipeline exists.
export async function createHistory(
  payload: HistoryCreatePayload
): Promise<HistoryEntry> {
  const response = await fetch(`${API_URL}/history/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse<HistoryEntry>(response);
}

// DELETE /history/{id} -- permanently remove one saved paper. Used by the
// "Delete" confirmation button on the homepage's paper-card options menu.
export async function deleteHistory(id: string): Promise<{ deleted: boolean; id: string }> {
  const response = await fetch(`${API_URL}/history/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse<{ deleted: boolean; id: string }>(response);
}

export async function renameHistory(documentId: string | number, payload: string) {
    const res = await fetch(`${API_URL}/history/rename/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: payload }),
    });
    if (!res.ok) throw new Error("Failed to rename history");
    return res.json();
}

export async function importPdf(file: File): Promise<{ history: { id: string } }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/documents/import`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  return handleResponse<{ history: { id: string } }>(response);
}

export async function fetchStickyNotes(documentId: string | number): Promise<StickyNoteEntry[]> {
    const res = await fetch(`${API_URL}/sticky_notes/get/${documentId}`, {
        method: "GET",
        credentials: "include",
    });
    if (!res.ok) return [];
    return res.json();
}

export async function createStickyNotes(documentId: string | number, payload: StickyNotePayload) {
    const res = await fetch(`${API_URL}/sticky_notes/create/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create sticky note");
    return res.json();
}

export async function clearStickyNotes(documentId: string | number, sticky_note_id: string | number) {
    const res = await fetch(`${API_URL}/sticky_notes/clear/${documentId}/${sticky_note_id}`, {
        method: "POST",
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to clear sticky notes");
    return res.json();
}

export async function editStickyNotes(documentId: string | number, payload: StickyNoteEdit) {
    const res = await fetch(`${API_URL}/sticky_notes/edit/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to edit sticky notes");
    return res.json();
}

// GET /documents -- every paper the logged-in caller has uploaded, FULL
// rows (including markdown_content) -- unlike fetchHistoryList above,
// which deliberately returns the same table trimmed down to just the
// mind-map fields. Used by the Interactive Paper page's paper-picker
// bubbles.
export async function fetchDocumentList(): Promise<DocumentEntry[]> {
  const response = await fetch(`${API_URL}/documents`, { credentials: "include" });
  return handleResponse<DocumentEntry[]>(response);
}

// GET /documents/latest -- whichever paper was uploaded most recently.
// Used when the Interactive Paper page is reached with no "?id=" in the
// URL, same role fetchLatestHistory plays for the Mind Map page.
export async function fetchLatestDocument(): Promise<DocumentEntry> {
  const response = await fetch(`${API_URL}/documents/latest`, { credentials: "include" });
  return handleResponse<DocumentEntry>(response);
}

// GET /documents/{id} -- one paper, full row. Used when a specific
// bubble is clicked.
export async function fetchDocumentById(id: string): Promise<DocumentEntry> {
  const response = await fetch(`${API_URL}/documents/${id}`, { credentials: "include" });
  return handleResponse<DocumentEntry>(response);
}

// GET /highlights/get/{documentId} -- every highlight saved on this
// paper. Fetched once when the paper's Markdown finishes rendering, then
// each one is redrawn as a <mark> at its saved block_index/offsets.
export async function fetchHighlights(documentId: string): Promise<HighlightEntry[]> {
  const response = await fetch(`${API_URL}/highlights/get/${documentId}`, { credentials: "include" });
  return handleResponse<HighlightEntry[]>(response);
}

// POST /highlights/create/{documentId} -- save a new highlight. Called
// once, right when a text selection is made with the highlighter tool
// armed -- there's no separate "edit" call anywhere, a highlight is
// immutable once created.
export async function createHighlight(documentId: string, payload: HighlightPayload): Promise<HighlightEntry> {
  const response = await fetch(`${API_URL}/highlights/create/${documentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse<HighlightEntry>(response);
}

// DELETE /highlights/{documentId}/{highlightId} -- remove one highlight.
export async function deleteHighlight(documentId: string, highlightId: string): Promise<{ deleted: boolean; id: string }> {
  const response = await fetch(`${API_URL}/highlights/${documentId}/${highlightId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse<{ deleted: boolean; id: string }>(response);
}

// GET /strokes/get/{documentId} -- every pencil stroke saved on this
// paper.
export async function fetchStrokes(documentId: string): Promise<StrokeEntry[]> {
  const response = await fetch(`${API_URL}/strokes/get/${documentId}`, { credentials: "include" });
  return handleResponse<StrokeEntry[]>(response);
}

// POST /strokes/create/{documentId} -- save a new pencil stroke. Called
// once per stroke, when the pointer lifts after drawing it.
export async function createStroke(documentId: string, payload: StrokePayload): Promise<StrokeEntry> {
  const response = await fetch(`${API_URL}/strokes/create/${documentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse<StrokeEntry>(response);
}

// DELETE /strokes/{documentId}/{strokeId} -- remove one stroke. This IS
// the eraser tool -- clicking a stroke with the eraser armed calls this,
// there's no separate "erase part of a stroke" capability.
export async function deleteStroke(documentId: string, strokeId: string): Promise<{ deleted: boolean; id: string }> {
  const response = await fetch(`${API_URL}/strokes/${documentId}/${strokeId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse<{ deleted: boolean; id: string }>(response);
}

export async function fetchReferenceById(documentId: string): Promise<ReferenceEntry> {
  const response = await fetch(`${API_URL}/references/${documentId}`, { 
    credentials: "include",
  });
  return handleResponse<ReferenceEntry>(response);
}
