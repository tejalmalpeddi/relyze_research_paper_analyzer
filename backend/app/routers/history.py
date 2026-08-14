from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_cookie
from app.core.db import supabase
from app.schemas.schemas import HistoryCreate, HistoryRename

router = APIRouter(prefix="/history", tags=["history"])

HISTORY_COLUMNS = "id, created_at, title, file_name, map_json, filters, user_id"


def _history_query():
    return supabase.table("documents").select(HISTORY_COLUMNS)


def _normalize_history_row(row):
    return {
        "id": row["id"],
        "created_at": row.get("created_at"),
        "title": row.get("title") or row.get("file_name") or "Untitled paper",
        "map_json": row.get("map_json") or {"nodes": [], "edges": []},
        "filters": row.get("filters") or [],
        "user_id": row.get("user_id"),
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


@router.get("/search/{title}")
def history_search(title: str, user=Depends(verify_cookie)):
    response = (
        _history_query()
        .eq("user_id", user.id)
        .eq("title", title)
        .execute()
    )
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
        _history_query()
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_normalize_history_row(row) for row in response.data]


@router.get("/{history_id}")
def history_get_by_id(history_id: str, user=Depends(verify_cookie)):
    response = (
        _history_query()
        .eq("id", history_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"History item with id '{history_id}' not found."
        )
    return _normalize_history_row(response.data[0])


@router.put("/rename/{history_id}", status_code=status.HTTP_200_OK)
def history_rename(history_id: str, payload:HistoryRename, user=Depends(verify_cookie)):
    response = (
        supabase.table("documents")
        .update({"title": payload.title})
        .eq("id", history_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"History item with id '{history_id}' not found."
        )
    return {"edited": True, "id": history_id}

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
