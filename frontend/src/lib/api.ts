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

import { HistoryCreatePayload, HistoryEntry } from "./types";

// Where the backend actually lives. NEXT_PUBLIC_API_URL can be set in a
// .env.local file to point at a different backend (e.g. a deployed one)
// without changing this file at all. If it's not set, we assume you're
// running the backend locally with `uvicorn main:app` on its default port.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Turns a raw fetch() Response into either the parsed data (on success)
// or a thrown JavaScript Error with a readable message (on failure).
// FastAPI's two error shapes are both handled here:
//   - validation errors (HTTP 422) come back as { "detail": [ ... ] }
//   - our own raised errors (HTTPException) come back as
//     { "detail": "some message string" }
async function handleResponse<ExpectedShape>(
  response: Response
): Promise<ExpectedShape> {
  if (response.ok === false) {
    // .json() can itself fail if the body isn't valid JSON at all (e.g.
    // the backend crashed and returned an HTML error page instead) --
    // .catch(() => null) means "if that happens, just treat it as no
    // useful error body" instead of throwing a second, more confusing
    // error on top of the first one.
    const errorBody = await response.json().catch(() => null);

    let errorMessage: string;
    if (errorBody !== null && typeof errorBody.detail === "string") {
      errorMessage = errorBody.detail;
    } else {
      errorMessage = `Request failed with status ${response.status}`;
    }

    throw new Error(errorMessage);
  }

  const parsedData = await response.json();
  return parsedData as ExpectedShape;
}

// GET /history -- every saved paper, full data including map_json.
// Used by the homepage's "Previous Papers" section, and by the Mind Map
// page to find the one specific paper the user clicked into (see
// app/mindmap/page.tsx for why there isn't a dedicated "get one paper by
// id" endpoint yet -- we just fetch the whole list and search it here in
// the frontend).
export async function fetchHistoryList(): Promise<HistoryEntry[]> {
  const response = await fetch(`${API_URL}/history`);
  return handleResponse<HistoryEntry[]>(response);
}

// GET /history/search?title=... -- one entry, found by an EXACT title
// match (not a partial/fuzzy search). Not currently used anywhere in the
// app yet, but kept here since the backend route exists and works.
export async function fetchHistoryByTitle(title: string): Promise<HistoryEntry> {
  const response = await fetch(
    `${API_URL}/history/search?title=${encodeURIComponent(title)}`
  );
  return handleResponse<HistoryEntry>(response);
}

// GET /history/get_title -- a lightweight list of just titles, with no
// map_json attached. Meant for a future autocomplete/search box; not used
// anywhere in the app yet.
export async function fetchHistoryTitles(): Promise<{ title: string }[]> {
  const response = await fetch(`${API_URL}/history/get_title`);
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
    body: JSON.stringify(payload),
  });
  return handleResponse<HistoryEntry>(response);
}

// DELETE /history/{id} -- permanently remove one saved paper. Used by the
// "Delete" confirmation button on the homepage's paper-card options menu.
export async function deleteHistory(id: number): Promise<{ deleted: boolean; id: number }> {
  const response = await fetch(`${API_URL}/history/${id}`, {
    method: "DELETE",
  });
  return handleResponse<{ deleted: boolean; id: number }>(response);
}
