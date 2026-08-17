from pydantic import BaseModel, Field
from typing import Optional


class KeywordBackgroundItem(BaseModel):
    term: str
    summary: str


class RelatedInfoBackgroundItem(BaseModel):
    title: str
    summary: str


class ImageBackgroundItem(BaseModel):
    file_name: Optional[str] = None
    storage_path: Optional[str] = None
    page_number: Optional[int] = None
    image_type: Optional[str] = None
    summary: str


class BackgroundContent(BaseModel):
    title: str
    keywords: list[KeywordBackgroundItem] = Field(default_factory=list)
    related_info: list[RelatedInfoBackgroundItem] = Field(default_factory=list)
    images: list[ImageBackgroundItem] = Field(default_factory=list)
    source_pages: list[int] = Field(default_factory=list)
