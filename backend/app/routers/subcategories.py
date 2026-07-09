"""
Registers POST /api/subcategories/generate.
All business logic lives in the service layer. This file just handles HTTP.
"""

from fastapi import APIRouter, HTTPException

from app.schemas.subcategories import ParserOutput, SubcategoryResponse
from app.services.subcategory_generator import generate_subcategories

router = APIRouter(prefix="/api/subcategories", tags=["subcategories"])


@router.post(
    "/generate",
    response_model=SubcategoryResponse,
    summary="Generate concept-map subcategories from parsed paper",
)
def generate(payload: ParserOutput) -> SubcategoryResponse:
    """
    FastAPI validates the request body against ParserOutput, then we pass it to the service. 
    Any error becomes a 500 response instead of a crash.
    """
    try:
        return generate_subcategories(payload.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
