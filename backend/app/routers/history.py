import json

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_cookie
from app.core.db import supabase
from app.schemas.schemas import HistoryCreate, HistoryRename

router = APIRouter(prefix="/history", tags=["history"])

HISTORY_COLUMNS = (
    "id, created_at, title, file_name, map_json, filters, user_id, "
    "keywords, related_info, images"
)


def _history_query():
    return supabase.table("documents").select(HISTORY_COLUMNS)


def _parse_related_info(value):
    if not value:
        return None

    if isinstance(value, dict):
        return value

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {
                "related_information": [value],
            }
        return parsed if isinstance(parsed, dict) else None

    return None


def _clean_string(value):
    return value.strip() if isinstance(value, str) else ""


def _normalize_summary_items(items, title_key):
    normalized = []
    seen = set()

    for item in items or []:
        if isinstance(item, str):
            title = item.strip()
            summary = ""
        elif isinstance(item, dict):
            title = _clean_string(
                item.get(title_key)
                or item.get("term")
                or item.get("title")
                or item.get("name")
                or ""
            )
            summary = _clean_string(
                item.get("summary") or item.get("description") or ""
            )
        else:
            continue

        key = title.lower()
        if title and key not in seen:
            normalized.append({title_key: title, "summary": summary})
            seen.add(key)

    return normalized


def _keyword_terms(items):
    terms = []
    seen = set()

    for item in items or []:
        if isinstance(item, str):
            term = item.strip()
        elif isinstance(item, dict):
            term = _clean_string(
                item.get("term") or item.get("title") or item.get("name") or ""
            )
        else:
            continue

        key = term.lower()
        if term and key not in seen:
            terms.append(term)
            seen.add(key)

    return terms


def _image_match_key(image):
    if not isinstance(image, dict):
        return ""

    return (
        _clean_string(image.get("storage_path"))
        or _clean_string(image.get("file_name"))
        or str(image.get("page_number") or "")
    ).lower()


def _normalize_images(row_images, background_images):
    row_images = row_images or []
    background_images = background_images or []
    summary_by_key = {
        _image_match_key(image): image
        for image in background_images
        if _image_match_key(image)
    }

    normalized = []
    for image in row_images:
        if not isinstance(image, dict):
            continue

        next_image = dict(image)
        summary_image = summary_by_key.get(_image_match_key(image))
        if summary_image is not None and summary_image.get("summary"):
            next_image["summary"] = summary_image["summary"]
        normalized.append(next_image)

    if normalized:
        return normalized

    return [image for image in background_images if isinstance(image, dict)]


def _normalize_history_row(row):
    background = _parse_related_info(row.get("related_info"))
    if background is not None:
        background["keywords"] = _normalize_summary_items(
            background.get("keywords") or row.get("keywords"),
            "term",
        )
        background["key_terms"] = _keyword_terms(background["keywords"])
        background["related_info"] = _normalize_summary_items(
            background.get("related_info") or background.get("related_information"),
            "title",
        )
        background["related_information"] = background["related_info"]
        background["images"] = _normalize_images(
            row.get("images"),
            background.get("images"),
        )

    images = _normalize_images(
        row.get("images"),
        background.get("images") if background is not None else [],
    )

    return {
        "id": row["id"],
        "created_at": row.get("created_at"),
        "title": row.get("title") or row.get("file_name") or "Untitled paper",
        "map_json": row.get("map_json") or {"nodes": [], "edges": []},
        "filters": row.get("filters") or [],
        "user_id": row.get("user_id"),
        "keywords": row.get("keywords") or [],
        "related_info": row.get("related_info"),
        "images": images,
        "background": background,
    }


@router.post("/create", status_code=status.HTTP_201_CREATED)
def history_create(payload: HistoryCreate, user=Depends(verify_cookie)):
    history_dump = payload.model_dump(mode="json")
    response = (
        supabase.table("documents")
        .insert(
            {
                "created_at": history_dump["created_at"],
                "title": history_dump["title"],
                "file_name": history_dump["title"],
                "map_json": history_dump["map_json"],
                "filters": history_dump["filters"],
                "status": "completed",
                "user_id": user.id,
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save history.")

    return _normalize_history_row(response.data[0])


@router.get("/search")
def history_search(title: str, user=Depends(verify_cookie)):
    response = _history_query().eq("user_id", user.id).eq("title", title).execute()
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"History item with title '{title}' not found."
        )
    return _normalize_history_row(response.data[0])


@router.get("/get_title")
def history_get_title(user=Depends(verify_cookie)):
    response = (
        supabase.table("documents")
        .select("title, file_name")
        .eq("user_id", user.id)
        .execute()
    )
    return [
        {"title": row.get("title") or row.get("file_name") or "Untitled paper"}
        for row in response.data
    ]


@router.get("/latest")
def history_get_latest(user=Depends(verify_cookie)):
    response = (
        _history_query()
        .eq("user_id", user.id)
        .not_.is_("map_json", "null")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="No saved papers exist yet.")
    return _normalize_history_row(response.data[0])


@router.get("")
def history_get(user=Depends(verify_cookie)):
    response = (
        _history_query().eq("user_id", user.id).order("created_at", desc=True).execute()
    )
    return [_normalize_history_row(row) for row in response.data]


@router.put("/rename/{history_id}", status_code=status.HTTP_200_OK)
def history_rename(
    history_id: str, payload: HistoryRename, user=Depends(verify_cookie)
):
    next_title = payload.title.strip()
    if not next_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty.")

    response = (
        supabase.table("documents")
        .update({"title": next_title})
        .eq("id", history_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"History item with id '{history_id}' not found."
        )
    return {"edited": True, "id": history_id}


@router.get("/{history_id}")
def history_get_by_id(history_id: str, user=Depends(verify_cookie)):
    response = _history_query().eq("id", history_id).eq("user_id", user.id).execute()
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"History item with id '{history_id}' not found."
        )
    return _normalize_history_row(response.data[0])


@router.delete("/{history_id}", status_code=status.HTTP_200_OK)
def history_delete(history_id: str, user=Depends(verify_cookie)):
    response = (
        supabase.table("documents")
        .delete()
        .eq("id", history_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"History item with id '{history_id}' not found."
        )
    return {"deleted": True, "id": history_id}
