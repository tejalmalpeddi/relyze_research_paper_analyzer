from fastapi import APIRouter, HTTPException, Depends, status
from schemas import StickyNotesCreate
from core.db import supabase
from core.auth import verify_cookie

router = APIRouter(prefix="/sticky_notes", tags=["sticky_notes"])

@router.post("/create", status_code=status.HTTP_201_CREATED)
def sticky_notes_create(payload: StickyNotesCreate, user=Depends(verify_cookie)):
    response = (
        supabase.table("sticky_notes")
        .insert(
            {
                "created_at": payload.created_at,
                "color": payload.color,
                "content": payload.content,
                "position_x": payload.position_x,
                "position_y": payload.position_y,
                "id": payload.document_id
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save documents.")

    return response.data[0]

@router.get("/get/{documents_id}")
def sticky_notes_create(documents_id: int, user=Depends(verify_cookie)):
    response = (
        supabase.table("sticky_notes")
        .eq("id", documents_id)
        .execute()
    )
    return response.data

@router.post("/clear/{documents_id}", status_code=status.HTTP_200_OK)
def sticky_notes_create(documents_id: int, user=Depends(verify_cookie)):
    response = (
        supabase.table("sticky_notes")
        .delete()
        .eq("id", documents_id)
        .execute()
    )

    return {"deleted": True, "id": documents_id}
