from pydantic import BaseModel, Field, EmailStr
from typing import Any
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
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str