import shutil
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.routers.history import router as history_router
from app.routers.auth import router as auth_router
from app.routers.stickynotes import router as sticky_router
from app.routers.subcategories import router as subcategories_router
from pydantic import BaseModel
from content_gen.nlp_transformer_method.pipeline import run_pipeline

ROOT_DIRECTORY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIRECTORY / "parser"))

from parser import parse_and_save_pdf

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
app.include_router(sticky_router)
app.include_router(subcategories_router)


@app.get("/")
def read_root():
    return {"message": "Relyze backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/documents/import")
async def import_document(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    suffix = Path(file.filename or "").suffix or ".pdf"

    with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_file.flush()

        try:
            return parse_and_save_pdf(temp_file.name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


class GenerateMapRequest(BaseModel):
    document_id: str

@app.post("/generate-map")
async def generate_map_endpoint(request: GenerateMapRequest):
    try:
        result = run_pipeline(document_id=request.document_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
