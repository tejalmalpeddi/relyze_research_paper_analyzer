from fastapi import APIRouter, HTTPException, Depends, status
from backend.schemas import HistoryCreate
from backend.core.db import supabase
from backend.core.auth import verify_jwt

router = APIRouter(prefix="/history", tags=["history"])

@router.post("/create", status_code=status.HTTP_201_CREATED)
def history_create(payload: HistoryCreate, user=Depends(verify_jwt)):
    history_dump = payload.model_dump()
    response = (
        supabase.table("history")
        .insert(
            {
                "created_at": history_dump["created_at"],
                "title": history_dump["title"],
                "map_json": history_dump["map_json"],
                "filters": history_dump["filters"],
                "user_id": user.id
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save history.")

    return response.data[0]


@router.get("/search")
def history_search(title: str, user=Depends(verify_jwt)):
    response = supabase.table("history").select("*").eq("user_id", user.id).eq("title", title).execute()
    if not response.data:
        raise HTTPException(
            status_code=400, detail=f"History item with title '{title}' not found."
        )
    return response.data[0]


@router.get("/get_title") #grabs all titles for display
def history_get_title(user=Depends(verify_jwt)):
    response = supabase.table("history").eq("user_id", user.id).select("title").execute()
    return response.data


@router.get("") #gets everything
def history_get(user=Depends(verify_jwt)):
    response = supabase.table("history").select("*").eq("user_id", user.id).execute()
    return response.data