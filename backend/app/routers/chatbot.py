from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import verify_cookie
from app.core.db import supabase
from app.schemas.chatbot import ChatRequest, ChatResponse
from app.services.chatbot_service import chat_with_paper

router = APIRouter(
    prefix="/chat",
    tags=["chatbot"],
)


@router.post("/{document_id}", response_model=ChatResponse)
def chat_with_document(
    document_id: str,
    payload: ChatRequest,
    user=Depends(verify_cookie),
):
    response = (
        supabase.table("documents")
        .select("id, markdown_content")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    document = response.data[0]
    paper_content = document.get("markdown_content")

    if not paper_content:
        raise HTTPException(
            status_code=400,
            detail="Document does not contain parsed paper content.",
        )

    history = [
        message.model_dump()
        for message in payload.history
    ]

    try:
        answer = chat_with_paper(
            paper_content=paper_content,
            user_message=payload.message,
            history=history,
        )

        return ChatResponse(answer=answer)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )