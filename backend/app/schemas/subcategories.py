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

class PrerequisiteLevels(BaseModel):
    beginner:     list[str] = []
    intermediate: list[str] = []
    advanced:     list[str] = []

class ContentLevels(BaseModel):
    beginner:     str
    intermediate: str
    advanced:     str

# --- Response (what goes OUT) ---

class ContentLevels(BaseModel):
    beginner: str
    intermediate: str
    advanced: str


class PrerequisiteLevels(BaseModel):
    beginner: list[str] = Field(default_factory=list)
    intermediate: list[str] = Field(default_factory=list)
    advanced: list[str] = Field(default_factory=list)


class SubcategoryItem(BaseModel):
    """One node on the concept map."""
    id: str
    name: str
    category: CategoryLiteral
<<<<<<< HEAD
    content: ContentLevels
    sourcePage: int
    sourceSnippet: str
    relatedTerms: list[str]
    prerequisites: PrerequisiteLevels
=======
    content:          ContentLevels
    sourcePage: int
    sourceSnippet: str
    relatedTerms: list[str]
    prerequisites:    PrerequisiteLevels
>>>>>>> 52c31bc (minor stuff)
    importance: int = Field(..., ge=1, le=5)  # must be 1–5

class SubcategoryResponse(BaseModel):
    """Full response returned to the frontend."""
    paperId: str                          # stable ID derived from the filename
    title: str                            # human-readable paper title
    sourceFile: str                       # original filename
    subcategories: list[SubcategoryItem]  # all the concept map nodes
    totalCount: int                       # how many nodes there are
