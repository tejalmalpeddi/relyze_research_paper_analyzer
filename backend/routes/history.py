from fastapi import APIRouter, HTTPException, Depends, status
from backend.schemas import HistoryCreate
from backend.core.db import supabase
from backend.core.auth import get_current_user

router = APIRouter(prefix="/history", tags=["history"])

@router.post("/create", status_code=status.HTTP_201_CREATED)
def history_create(payload: HistoryCreate, user=Depends(get_current_user)):
    history_dump = payload.model_dump()
    response = (
        supabase.table("history")
        .insert(
            {
                "created_at": history_dump["created_at"],
                "title": history_dump["title"],
                "map_json": history_dump["map_json"],
                "filters": history_dump["filters"],
                "user_id": user.user.id
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save history.")

    return response.data[0]


@router.get("/search")
def history_search(title: str, user=Depends(get_current_user)):
    response = supabase.table("history").select("*").eq("user_id", user.user.id).eq("title", title).execute()
    if not response.data:
        raise HTTPException(
            status_code=400, detail=f"History item with title '{title}' not found."
        )
    return response.data[0]


@router.get("/get_title")
def history_get_title(user=Depends(get_current_user)):
    response = supabase.table("history").eq("user_id", user.id).select("title").execute()
    return response.data


@router.get("")
def history_get(user=Depends(get_current_user)):
    response = supabase.table("history").select("*").eq("user_id", user.user.id).execute()
    return response.data