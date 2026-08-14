from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import verify_cookie
from app.core.db import supabase
from app.schemas.schemas import StickyNotesCreate, StickyNotesUpdate

router = APIRouter(prefix="/sticky_notes", tags=["sticky_notes"])


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


@router.post("/{document_id}", status_code=status.HTTP_201_CREATED)
def sticky_notes_create(
    document_id: str,
    payload: StickyNotesCreate,
    user=Depends(verify_cookie),
):
    _verify_document_owner(document_id, user.id)

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
                "document_id": document_id,
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save sticky note.")

    return response.data[0]


@router.get("/get/{document_id}")
def sticky_notes_get(document_id: str, user=Depends(verify_cookie)):
    _verify_document_owner(document_id, user.id)

    response = (
        supabase.table("sticky_notes")
        .select("*")
        .eq("document_id", document_id)
        .execute()
    )
    return response.data


@router.post("/clear/{document_id}/{sticky_notes_id}", status_code=status.HTTP_200_OK)
def sticky_notes_clear(sticky_notes_id: str, document_id: str, user=Depends(verify_cookie)):
    _verify_document_owner(document_id, user.id)
    supabase.table("sticky_notes").delete().eq("id", sticky_notes_id).execute()

    return {"deleted": True, "id": sticky_notes_id}


@router.put("/edit/{document_id}", status_code=status.HTTP_200_OK)
def sticky_notes_edit(
    document_id: str,
    payload: StickyNotesUpdate,
    user=Depends(verify_cookie),
):
    _verify_document_owner(document_id, user.id)

    update_data = {
        key: value
        for key, value in payload.model_dump(mode="json").items()
        if value is not None and key != "id"
    }
    response = (
        supabase.table("sticky_notes")
        .update(update_data)
        .eq("document_id", document_id)
        .eq("id", payload.id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save sticky note.")

    return response.data[0]
