import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import structlog

from app.core.settings import settings
from app.core.logging import setup_logging, get_logger
from app.core.rag_engine import init_rag_engine
from app.core.ingest_queue import start_workers, stop_workers

from app.api.routes_health import router as health_router
from app.api.routes_ingest import router as ingest_router
from app.api.routes_query import router as query_router
from app.api.routes_admin import router as admin_router

setup_logging()
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up LightRAG Backend", version="0.1.0")
    
    # Init RAG Engine (Milvus + Gemini)
    try:
        await init_rag_engine()
    except Exception as e:
        logger.error("Failed to initialize RAG engine", exc_info=True)
        raise e
        
    # Start ingest workers
    await start_workers()
    
    yield
    
    # Shutdown
    logger.info("Shutting down LightRAG Backend")
    await stop_workers()

app = FastAPI(
    title="LightRAG Backend",
    description="Text-only RAG backend using LightRAG and RAGAnything",
    version="0.1.0",
    lifespan=lifespan
)

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(ingest_router, prefix="/api/v1")
app.include_router(query_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
