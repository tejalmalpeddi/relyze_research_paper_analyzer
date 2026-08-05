"""
Pydantic models for the subcategories endpoint.
Data in  → ParserOutput  (matches parser.py output)
Data out → SubcategoryResponse  (map-ready JSON for the frontend)
"""

from typing import Literal
from pydantic import BaseModel, Field

# The only valid category values. Pydantic rejects anything not in this list.
CategoryLiteral = Literal[
    "Problem",
    "Background",
    "Method",
    "Architecture",
    "Dataset",
    "Experiment",
    "Result",
    "Limitation",
    "Future Work",
    "Key Term",
]

# --- Request (what comes IN) ---

class PageItem(BaseModel):
    page_number: int
    text: str

class ParserOutput(BaseModel):
    """Matches the JSON shape produced by parser.py."""
    file_name: str
    page_count: int
    pages: list[PageItem]

# --- Response (what goes OUT) ---

class SubcategoryItem(BaseModel):
    """One node on the concept map."""
    id: str
    name: str
    category: CategoryLiteral
    shortExplanation: str
    sourcePage: int
    sourceSnippet: str
    relatedTerms: list[str]
    prerequisites: list[str]
    importance: int = Field(..., ge=1, le=5)  # must be 1–5

class SubcategoryResponse(BaseModel):
    """Full response returned to the frontend."""
    paperId: str                          # stable ID derived from the filename
    title: str                            # human-readable paper title
    sourceFile: str                       # original filename
    subcategories: list[SubcategoryItem]  # all the concept map nodes
    totalCount: int                       # how many nodes there are
    