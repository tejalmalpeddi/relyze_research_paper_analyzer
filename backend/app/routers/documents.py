# app/routers/documents.py
#
# Everything that hangs off a single uploaded paper (a row in the
# "documents" table), other than the mind-map-focused view of it that
# history.py already serves under /history/*. Two things live here:
#
#   1. Document reads (list / latest / by-id) -- the FULL row, including
#      raw_text/markdown_content/file_name, which history.py's routes
#      deliberately don't return (they're trimmed for the mind-map view).
#      Used by the Interactive Paper page.
#
#   2. Highlights and strokes -- the two annotation types the Interactive
#      Paper page's highlighter/pencil/eraser tools save. Both kinds are
#      rows in one real Supabase table, "pdf_annotations" (created
#      directly in Supabase, told apart by an "annotation_type" column) --
#      see the comment further down for exactly how each column is used.
#      Ownership follows stickynotes.py's pattern: a "does this document
#      belong to this user" check first, then plain CRUD. Sticky notes and
#      annotations are conceptually the same shape (a per-document,
#      per-user, backend-persisted UI extra) but live in different files
#      because sticky notes belong to the Mind Map page, not this one --
#      this file is everything the Interactive Paper page specifically
#      needs.
import re
import requests

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_cookie
from app.core.db import supabase
from app.schemas.schemas import HighlightCreate, StrokeCreate

router = APIRouter(tags=["documents"])

# Full row -- unlike history.py's HISTORY_COLUMNS, nothing is trimmed
# here, since the whole point of this file is to hand back raw_text /
# markdown_content / file_name, which the mind-map-focused /history/*
# routes intentionally leave out.
DOCUMENT_COLUMNS = (
    "id, created_at, user_id, file_name, title, status, "
    "raw_text, markdown_content, structured_data"
)


def _documents_query():
    return supabase.table("documents").select(DOCUMENT_COLUMNS)


# Same ownership check stickynotes.py already has (as _verify_document_owner
# there) -- kept as its own local copy here rather than shared, since it's
# 8 lines and every route in THIS file already needs it anyway.
def _verify_document_owner(document_id: str, user_id: str):
    document_check = (
        supabase.table("documents")
        .select("id")
        .eq("id", document_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not document_check.data:
        raise HTTPException(status_code=404, detail="Document not found.")


def _filter_references(row, document_id):
    # raw_text = row.get("raw_text")
    # pages = [page["text"] for page in raw_text["pages"]]
    # markdown_content = "".join(pages)
    references = row.get("references")
    if not references:
        markdown_content = row.get("markdown_content")

        if not markdown_content:
            return {
                "id": row.get("id"),
                "title": row.get("title") or row.get("file_name") or "Untitled paper",
                "markdown_content": "Unfortunately, no citations were matched in this paper; please to refer to the pdf.",
            }
        pattern = r"(?:#+\s*|^(?=\n))\s*(?:References|Bibliography|Works Cited)\b"
        match = re.search(pattern, markdown_content, re.IGNORECASE | re.MULTILINE)

        if match:
            refs_text = markdown_content[match.end() :].strip()
            add_references = _add_references(refs_text)

            response = (
                supabase.table("documents")
                .update({"references": add_references})
                .eq("id", document_id)
                .execute()
            )

            return {
                "id": row.get("id"),
                "title": row.get("title"),
                "markdown_content": add_references,
            }

    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "markdown_content": references or "No citations matched; please to manually refer pdf.",
    }


def _add_references(raw_text):
    refs = [r.strip() for r in raw_text.split("\n") if r.strip()]
    linked_refs = []

    for ref in refs:
        has_link = bool(re.search(r"\[.*?\]\(.*?\)", ref))
        cleaned_ref = re.sub(r"\s+", " ", ref).strip()
        cleaned_ref = re.sub(r"\|", "", cleaned_ref).strip()
        cleaned_ref = re.sub(r"[\-\—]{3,}", "", cleaned_ref).strip()
        if has_link:
            linked_refs.append(f"* {cleaned_ref}")
            continue
        url = "https://api.crossref.org/works"
        params = {
            "query.bibliographic": cleaned_ref,
            "rows": 1,
            "mailto": "dummy@relyze-app.com",
        }

        response = requests.get(url, params=params)
        link = None
        if response.status_code == 200:
            items = response.json().get("message", {}).get("items", [])
            if items:
                doi = items[0].get("DOI")
                if doi:
                    link = f"https://doi.org/{doi}"
        if link:
            linked_refs.append(f"* [{cleaned_ref}]({link})")
            print("[add references] SUCCESS", link, cleaned_ref)
        else:
            linked_refs.append(f"* {cleaned_ref}")
            print("[add references] LINK NOT FOUND", link, cleaned_ref)
    return "\n".join(linked_refs)

# ---------------------------------------------------------------------------
# Document reads
# ---------------------------------------------------------------------------

# Must stay registered BEFORE GET /documents/{document_id} below --
# otherwise FastAPI would try to match "latest" as that route's
# document_id and fail before ever reaching this route (same ordering
# rule history.py's own /latest already follows).
@router.get("/documents/latest")
def documents_get_latest(user=Depends(verify_cookie)):
    response = (
        _documents_query()
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="No uploaded papers exist yet.")
    return response.data[0]


@router.get("/documents")
def documents_get(user=Depends(verify_cookie)):
    response = (
        _documents_query()
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


@router.get("/documents/{document_id}")
def documents_get_by_id(document_id: str, user=Depends(verify_cookie)):
    response = _documents_query().eq("id", document_id).eq("user_id", user.id).execute()
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"Document with id '{document_id}' not found."
        )
    return response.data[0]


@router.get("/references/{document_id}")
def history_references_by_id(document_id: str, user=Depends(verify_cookie)):
    response = (
        supabase.table("documents")
        .select()
        .eq("id", document_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"Document with id '{document_id}' not found."
        )
    return _filter_references(response.data[0], document_id)


# ---------------------------------------------------------------------------
# Highlights and strokes both live in ONE real table, "pdf_annotations"
# (already created directly in Supabase -- not the separate highlights/
# strokes tables from the original design, which never got created and
# are no longer used). One row can be either kind, told apart by
# "annotation_type". Columns that don't apply to a given type are just
# left null on that row (e.g. "selected_text" is null for a stroke).
#
# Column mapping, since this table's columns don't exactly match the
# names the frontend already uses (kept as-is on the frontend side to
# avoid touching more files than necessary):
#   page_number    -> holds block_index for a highlight (which rendered
#                     Markdown block it's anchored to -- see page.tsx).
#                     The paper is shown as one continuous scroll now,
#                     not real numbered pages, so this column is being
#                     reused for that purpose rather than a literal PDF
#                     page number. Always 0 for a stroke (not anchored
#                     to any one block).
#   selected_text  -> the highlighted text itself (a highlight's "quote").
#                     Null for a stroke.
#   coordinates    -> a highlight's {start_offset, end_offset} within its
#                     block, OR a stroke's {points, stroke_width}.
#   note_content   -> not used by either type in this pass (there's no
#                     "note" tool yet) -- always null.
# ---------------------------------------------------------------------------

ANNOTATIONS_TABLE = "pdf_annotations"
HIGHLIGHT_TYPE = "highlight"
STROKE_TYPE = "highlight"


def _normalize_highlight_row(row: dict) -> dict:
    coordinates = row.get("coordinates") or {}
    return {
        "id": row["id"],
        "document_id": row["document_id"],
        "block_index": row.get("page_number"),
        "start_offset": coordinates.get("start_offset"),
        "end_offset": coordinates.get("end_offset"),
        "quote": row.get("selected_text"),
        "color": row.get("color"),
        "created_at": row.get("created_at"),
    }


def _normalize_stroke_row(row: dict) -> dict:
    coordinates = row.get("coordinates") or {}
    return {
        "id": row["id"],
        "document_id": row["document_id"],
        "points": coordinates.get("points", []),
        "color": row.get("color"),
        "stroke_width": coordinates.get("stroke_width"),
        "created_at": row.get("created_at"),
    }


def _is_stroke_row(row: dict) -> bool:
    coordinates = row.get("coordinates") or {}
    return isinstance(coordinates.get("points"), list)


def _is_highlight_row(row: dict) -> bool:
    return not _is_stroke_row(row)


# ---------------------------------------------------------------------------
# Highlights -- immutable text-range spans. No edit route: changing which
# text a highlight covers is indistinguishable from delete-and-recreate.
# ---------------------------------------------------------------------------


@router.post("/highlights/create/{document_id}", status_code=status.HTTP_201_CREATED)
def highlights_create(
    document_id: str,
    payload: HighlightCreate,
    user=Depends(verify_cookie),
):
    _verify_document_owner(document_id, user.id)

    highlight_dump = payload.model_dump(mode="json")
    response = (
        supabase.table(ANNOTATIONS_TABLE)
        .insert(
            {
                "document_id": document_id,
                "user_id": user.id,
                "annotation_type": HIGHLIGHT_TYPE,
                "page_number": highlight_dump["block_index"],
                "selected_text": highlight_dump["quote"],
                "color": highlight_dump["color"],
                "coordinates": {
                    "start_offset": highlight_dump["start_offset"],
                    "end_offset": highlight_dump["end_offset"],
                },
                "created_at": highlight_dump["created_at"],
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save highlight.")

    return _normalize_highlight_row(response.data[0])


@router.get("/highlights/get/{document_id}")
def highlights_get(document_id: str, user=Depends(verify_cookie)):
    _verify_document_owner(document_id, user.id)

    response = (
        supabase.table(ANNOTATIONS_TABLE)
        .select("*")
        .eq("document_id", document_id)
        .eq("annotation_type", HIGHLIGHT_TYPE)
        .execute()
    )
    return [
        _normalize_highlight_row(row) for row in response.data if _is_highlight_row(row)
    ]


@router.delete(
    "/highlights/{document_id}/{highlight_id}", status_code=status.HTTP_200_OK
)
def highlights_delete(document_id: str, highlight_id: str, user=Depends(verify_cookie)):
    _verify_document_owner(document_id, user.id)

    response = (
        supabase.table(ANNOTATIONS_TABLE)
        .delete()
        .eq("document_id", document_id)
        .eq("id", highlight_id)
        .eq("annotation_type", HIGHLIGHT_TYPE)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Highlight not found.")
    return {"deleted": True, "id": highlight_id}


# ---------------------------------------------------------------------------
# Strokes -- freehand pencil drawing. No edit route: strokes are never
# repositioned, only erased (DELETE below IS the eraser).
# ---------------------------------------------------------------------------


@router.post("/strokes/create/{document_id}", status_code=status.HTTP_201_CREATED)
def strokes_create(
    document_id: str,
    payload: StrokeCreate,
    user=Depends(verify_cookie),
):
    _verify_document_owner(document_id, user.id)

    stroke_dump = payload.model_dump(mode="json")
    response = (
        supabase.table(ANNOTATIONS_TABLE)
        .insert(
            {
                "document_id": document_id,
                "user_id": user.id,
                "annotation_type": STROKE_TYPE,
                "page_number": 0,
                "color": stroke_dump["color"],
                "coordinates": {
                    "points": stroke_dump["points"],
                    "stroke_width": stroke_dump["stroke_width"],
                },
                "created_at": stroke_dump["created_at"],
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save stroke.")

    return _normalize_stroke_row(response.data[0])


@router.get("/strokes/get/{document_id}")
def strokes_get(document_id: str, user=Depends(verify_cookie)):
    _verify_document_owner(document_id, user.id)

    response = (
        supabase.table(ANNOTATIONS_TABLE)
        .select("*")
        .eq("document_id", document_id)
        .eq("annotation_type", STROKE_TYPE)
        .execute()
    )
    return [_normalize_stroke_row(row) for row in response.data if _is_stroke_row(row)]


@router.delete("/strokes/{document_id}/{stroke_id}", status_code=status.HTTP_200_OK)
def strokes_delete(document_id: str, stroke_id: str, user=Depends(verify_cookie)):
    _verify_document_owner(document_id, user.id)

    response = (
        supabase.table(ANNOTATIONS_TABLE)
        .delete()
        .eq("document_id", document_id)
        .eq("id", stroke_id)
        .eq("annotation_type", STROKE_TYPE)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Stroke not found.")
    return {"deleted": True, "id": stroke_id}


@router.post("/strokes/clear/{document_id}", status_code=status.HTTP_200_OK)
def strokes_clear(document_id: str, user=Depends(verify_cookie)):
    _verify_document_owner(document_id, user.id)

    (
        supabase.table(ANNOTATIONS_TABLE)
        .delete()
        .eq("document_id", document_id)
        .eq("annotation_type", STROKE_TYPE)
        .execute()
    )

    return {"deleted": True, "id": document_id}
