from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from typing import Any, Optional
from datetime import datetime, timezone

class HistoryCreate(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    title: str
    map_json: dict[str , Any]
    filters: list[str]
    
class HistoryRead(BaseModel):
    id: int
    created_at: datetime
    title: str
    map_json: dict[str , Any]
    filters: list[str]
    user_id: str
    
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    raw_user_meta_data: Optional[dict[str, Any]] = None
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
class UserEdit(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    raw_user_meta_data: Optional[dict[str, Any]] = None
<<<<<<< HEAD
    
class StickyNotesCreate(BaseModel):
    color: str
    content: str
    position_x: float
    position_y: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    document_id: UUID
=======
>>>>>>> origin/main
