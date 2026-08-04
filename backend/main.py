from fastapi import FastAPI, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from schemas import HistoryCreate, HistoryRead
from app.routers.subcategories import router as subcategories_router

load_dotenv()

app = FastAPI(title="Relyze API")
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Register subcategories router (POST /api/subcategories/generate)
app.include_router(subcategories_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Relyze backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/history/create", status_code=status.HTTP_201_CREATED)
def history_create(payload: HistoryCreate):
    history_dump = payload.model_dump()
    response = (
        supabase.table("history")
        .insert(
            {
                "created_at": history_dump["created_at"],
                "title": history_dump["title"],
                "map_json": history_dump["map_json"],
                "filters": history_dump["filters"],
            }
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save history.")

    return response.data[0]


@app.get("/history/search")
def history_search(title: str):
    response = supabase.table("history").select("*").eq("title", title).execute()
    if not response.data:
        raise HTTPException(
            status_code=400, detail=f"History item with title '{title}' not found."
        )
    return response.data[0]


@app.get("/history/get_title")
def history_get_title():
    response = supabase.table("history").select("title").execute()
    return response.data


@app.get("/history")
def history_get():
    response = supabase.table("history").select("*").execute()
    return response.data
