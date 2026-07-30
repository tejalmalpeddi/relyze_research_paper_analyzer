from fastapi import APIRouter, HTTPException, Depends, status
from schemas import HistoryCreate, HistoryRead
from core.db import supabase
from core.auth import verify_cookie

router = APIRouter(prefix="/history", tags=["history"])

@router.post("/create", status_code=status.HTTP_201_CREATED)
def history_create(payload: HistoryCreate, user=Depends(verify_cookie)):
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
def history_search(title: str, user=Depends(verify_cookie)):
    response = supabase.table("history").select("*").eq("user_id", user.id).eq("title", title).execute()
    if not response.data:
        raise HTTPException(
            status_code=400, detail=f"History item with title '{title}' not found."
        )
    return response.data[0]


@router.get("/get_title") #grabs all titles for display
def history_get_title(user=Depends(verify_cookie)):
    response = supabase.table("history").select("title").eq("user_id", user.id).execute()
    return response.data


@router.get("") #gets everything
def history_get(user=Depends(verify_cookie)):
    response = supabase.table("history").select("*").eq("user_id", user.id).execute()
    return response.data


# Must stay registered BEFORE GET /{history_id} below -- otherwise FastAPI
# would try to match "latest" as that route's numeric history_id and
# reject it before ever reaching this route.
@router.get("/latest")
def history_get_latest(user=Depends(verify_cookie)):
    response = (
        supabase.table("history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="No saved papers exist yet.")
    return response.data[0]


@router.get("/{history_id}")
def history_get_by_id(history_id: int, user=Depends(verify_cookie)):
    response = (
        supabase.table("history")
        .select("*")
        .eq("id", history_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404, detail=f"History item with id '{history_id}' not found."
        )
    return response.data[0]


@router.delete("/{history_id}", status_code=status.HTTP_200_OK)
def history_delete(history_id: int, user=Depends(verify_cookie)):
    # Filtering by BOTH id and user_id in the same delete means someone
    # else's paper id fails exactly like a nonexistent one would -- there's
    # no way to tell, from the response, the difference between "that id
    # doesn't exist" and "that id exists but isn't yours."
    response = (
        supabase.table("history")
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