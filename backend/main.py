from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.history import router as history_router
from app.routers.auth import router as auth_router
from app.routers.subcategories import router as subcategories_router

app = FastAPI(title="Relyze API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(history_router)
app.include_router(auth_router)

# Register subcategories router (POST /api/subcategories/generate)
app.include_router(subcategories_router)


@app.get("/")
def read_root():
    return {"message": "Relyze backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
