from fastapi import APIRouter, HTTPException, Depends, status
from app.schemas.schemas import StickyNotesCreate, StickyNotesUpdate
from app.core.db import supabase
from app.core.auth import verify_cookie

router = APIRouter(prefix="/sticky_notes", tags=["sticky_notes"])

@router.post("/create/{documents_id}", status_code=status.HTTP_201_CREATED)
def sticky_notes_create(documents_id: int, payload: StickyNotesCreate, user=Depends(verify_cookie)):
    history_check = (
        supabase.table("history")
        .select("id")
        .eq("id", documents_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not history_check.data:
        raise HTTPException(status_code=404, detail="Wrong user.")
    
    sticky_notes_dump = payload.model_dump(mode="json")
    response = (
        supabase.table("sticky_notes")
        .insert(
            {
                "color": sticky_notes_dump["color"],
                "content": sticky_notes_dump["content"],
                "position_x": sticky_notes_dump["position_x"],
                "position_y": sticky_notes_dump["position_y"],
                "created_at": sticky_notes_dump["created_at"],
                "history_id": documents_id
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save documents.")

    return response.data[0]

@router.get("/get/{documents_id}")
def sticky_notes_get(documents_id: int, user=Depends(verify_cookie)):
    history_check = (
        supabase.table("history")
        .select("id")
        .eq("id", documents_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not history_check.data:
        raise HTTPException(status_code=404, detail="Wrong user.")
    
    response = (
        supabase.table("sticky_notes")
        .select("*")
        .eq("history_id", documents_id)
        .execute()
    )
    return response.data

@router.post("/clear/{documents_id}", status_code=status.HTTP_200_OK)
def sticky_notes_clear(documents_id: int, user=Depends(verify_cookie)):
    history_check = (
        supabase.table("history")
        .select("id")
        .eq("id", documents_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not history_check.data:
        raise HTTPException(status_code=404, detail="Wrong user.")
    
    response = (
        supabase.table("sticky_notes")
        .delete()
        .eq("history_id", documents_id)
        .execute()
    )

    return {"deleted": True, "id": documents_id}

@router.put("/edit/{documents_id}", status_code=status.HTTP_200_OK)
def sticky_notes_edit(documents_id: int, payload: StickyNotesUpdate, user=Depends(verify_cookie)):
    history_check = (
        supabase.table("history")
        .select("id")
        .eq("id", documents_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not history_check.data:
        raise HTTPException(status_code=404, detail="Wrong user.")
    
    update_data = {k: v for k, v in payload.model_dump(mode="json").items() if v is not None and k != "id"}
    response = (
        supabase.table("sticky_notes")
        .update(update_data)
        .eq("history_id", documents_id)
        .eq("id", payload.id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save documents.")

    return response.data[0]
    
    
