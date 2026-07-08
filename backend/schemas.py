from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime, timezone

class HistoryCreate(BaseModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    title: str
    map_json: dict[str , Any]
    filters: list[str]
    
class HistoryRead(BaseModel):
    created_at: datetime
    id: int
    title: str
    map_json: dict[str , Any]
    filters: list[str]
    