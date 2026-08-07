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

import { HistoryCreatePayload, HistoryEntry, StickyNotePayload, StickyNoteEdit } from "./types";
//generic type ^^ later comes in to play 

// Where the backend actually lives. NEXT_PUBLIC_API_URL can be set in a
// .env.local file to point at a different backend (e.g. a deployed one)
// without changing this file at all. If it's not set, we assume you're
// running the backend locally with `uvicorn main:app` on its default port.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
export async function fetchHistoryById(id: number): Promise<HistoryEntry> {
  const response = await fetch(`${API_URL}/history/${id}`, { credentials: "include" });
  return handleResponse<HistoryEntry>(response);
}

// GET /history/latest -- one entry, whichever was created most recently.
// Used by the Mind Map page when it's reached via the plain "Mind Map"
// navbar tab (no "?id=" in the URL), so it can ask the backend to sort
// and pick the newest row directly instead of downloading every saved
// paper and comparing created_at timestamps here.
export async function fetchLatestHistory(): Promise<HistoryEntry> {
  const response = await fetch(`${API_URL}/history/latest`, { credentials: "include" });
  return handleResponse<HistoryEntry>(response);
}

// GET /history/get_title -- a lightweight list of just titles, with no
// map_json attached. Meant for a future autocomplete/search box; not used
// anywhere in the app yet.
export async function fetchHistoryTitles(): Promise<{ title: string }[]> {
  const response = await fetch(`${API_URL}/history/get_title`, { credentials: "include" });
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
export async function deleteHistory(id: number): Promise<{ deleted: boolean; id: number }> {
  const response = await fetch(`${API_URL}/history/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse<{ deleted: boolean; id: number }>(response);
}

export async function fetchStickyNotes(documentId: string | number) {
    const res = await fetch(`${API_URL}/sticky_notes/get/${documentId}`, {
        method: "GET",
        credentials: "include",
    });
    if (!res.ok) return {};
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

export async function clearStickyNotes(documentId: string | number) {
    const res = await fetch(`${API_URL}/sticky_notes/clear/${documentId}`, {
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
