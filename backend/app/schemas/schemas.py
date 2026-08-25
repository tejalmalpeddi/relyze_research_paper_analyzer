from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from typing import Any, Optional
from datetime import datetime, timezone

class HistoryCreate(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    title: str
    map_json: dict[str , Any]
    filters: list[str]

class HistoryRename(BaseModel):
    title: str
    
class HistoryRead(BaseModel):
    id: int
    created_at: datetime
    title: str
    map_json: dict[str , Any]
    filters: list[str]
    user_id: str
    keywords: list[str] = Field(default_factory=list)
    related_info: Optional[str] = None
    images: list[dict[str, Any]] = Field(default_factory=list)
    background: Optional[dict[str, Any]] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
class UserEdit(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserPasswordResetRequest(BaseModel):
    email: EmailStr
    
class UserPasswordCode(BaseModel):
    email: EmailStr
    token: str
    
class StickyNotesCreate(BaseModel):
    color: str
    content: str
    position_x: float
    position_y: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class StickyNotesUpdate(BaseModel):
    id: UUID
    color: Optional[str] = None
    content: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None

class HighlightCreate(BaseModel):
    block_index: int
    start_offset: int
    end_offset: int
    quote: str
    color: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StrokePoint(BaseModel):
    x: float
    y: float

class StrokeCreate(BaseModel):
    points: list[StrokePoint]
    color: str
    stroke_width: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
