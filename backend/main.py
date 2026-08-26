import shutil
import sys
import tempfile
import mimetypes
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from app.routers.history import router as history_router
from app.routers.auth import router as auth_router
from app.routers.stickynotes import router as sticky_router
from app.routers.subcategories import router as subcategories_router
from app.routers.documents import router as documents_router
from app.core.auth import verify_cookie
from pydantic import BaseModel
from content_gen.nlp_transformer_method.pipeline import run_pipeline

from app.routers.chatbot import router as chatbot_router
from app.routers.documents import router as documents_router
from app.routers.subcategories import router as subcategories_router

import torch._dynamo
import pymupdf

torch._dynamo.config.suppress_errors = True

ROOT_DIRECTORY = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIRECTORY / "parser"))

from parser import parse_and_save_pdf

# parser/assets/ is where extracted PDF images get saved -- it's
# git-ignored (nothing in it is meant to be committed), so it simply
# doesn't exist on a fresh checkout until someone's parsed a PDF with
# images at least once. StaticFiles() raises immediately at startup if
# its directory is missing, which crashed the ENTIRE backend on any
# fresh clone -- creating it upfront (empty, if nothing's there yet)
# means startup no longer depends on that having happened already.
ASSETS_DIRECTORY = ROOT_DIRECTORY / "parser" / "assets"
ASSETS_DIRECTORY.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Relyze API")

BROWSER_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp"}
CONVERTIBLE_IMAGE_EXTENSIONS = {".jpx", ".jp2", ".j2k", ".jpf", ".jpm", ".mj2"}


def _asset_file_path(asset_path: str) -> Path:
    file_path = (ASSETS_DIRECTORY / asset_path).resolve()
    if ASSETS_DIRECTORY.resolve() not in file_path.parents:
        raise HTTPException(status_code=400, detail="Invalid asset path.")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Asset not found.")
    return file_path


@app.get("/asset-preview/{asset_path:path}")
def asset_preview(asset_path: str):
    file_path = _asset_file_path(asset_path)
    extension = file_path.suffix.lower()

    if extension in BROWSER_IMAGE_EXTENSIONS:
        media_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        return FileResponse(file_path, media_type=media_type)

    if extension in CONVERTIBLE_IMAGE_EXTENSIONS:
        try:
            pixmap = pymupdf.Pixmap(str(file_path))
            if pixmap.n >= 5:
                pixmap = pymupdf.Pixmap(pymupdf.csRGB, pixmap)
            return Response(content=pixmap.tobytes("png"), media_type="image/png")
        except Exception as error:
            raise HTTPException(status_code=415, detail=f"Could not render image: {error}")

    raise HTTPException(status_code=415, detail="Unsupported image type.")

app.mount(
    "/assets",
    StaticFiles(directory=str(ASSETS_DIRECTORY)),
    name="assets",
)

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
app.include_router(documents_router)
app.include_router(chatbot_router)


@app.get("/")
def read_root():
    return {"message": "Relyze backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/documents/import")
async def import_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user=Depends(verify_cookie),
):
    filename = file.filename or ""
    suffix = Path(filename).suffix or ".pdf"

    if file.content_type != "application/pdf" and suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_file.flush()

        try:
            document = parse_and_save_pdf(temp_file.name, user.id, file_name=filename)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # The rest of the pipeline (NLP enrichment, LLM generation, saving)
    # can take a while -- it runs in the background so this request can
    # return as soon as the document exists, letting the frontend start
    # polling GET /documents/{id}'s `status` for live pipeline progress
    # instead of blocking on the whole thing.
    background_tasks.add_task(run_pipeline, document_id=document["id"])
    return {"document": document}


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
