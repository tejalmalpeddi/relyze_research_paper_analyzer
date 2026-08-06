from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routes import history, auth
from app.routers.subcategories import router as subcategories_router
from pydantic import BaseModel
from content_gen.nlp_transformer_method.pipeline import run_pipeline

app = FastAPI(title="Relyze API")


app.include_router(subcategories_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(history.router)
app.include_router(auth.router)


@app.get("/")
def read_root():
    return {"message": "Relyze backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


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
