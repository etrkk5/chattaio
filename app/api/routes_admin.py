from fastapi import APIRouter
from typing import List

from app.schemas.admin import StatsResponse, DeleteDocResponse
from app.core.settings import settings
from app.core.ingest_queue import list_jobs
from app.core.rag_engine import get_rag

router = APIRouter()

@router.get("/admin/stats", response_model=StatsResponse, tags=["Admin"])
async def get_stats():
    jobs = list_jobs()
    active = sum(1 for j in jobs.values() if j.get("status") in ("pending", "processing"))
    completed = sum(1 for j in jobs.values() if j.get("status") == "completed")
    failed = sum(1 for j in jobs.values() if j.get("status") == "failed")
    
    return StatsResponse(
        workspace=settings.lightrag_workspace,
        working_dir=settings.lightrag_working_dir,
        active_jobs=active,
        completed_jobs=completed,
        failed_jobs=failed
    )

@router.delete("/admin/docs/{doc_id}", response_model=DeleteDocResponse, tags=["Admin"])
async def delete_document(doc_id: str):
    rag = get_rag()
    try:
        if hasattr(rag, "delete_by_entity"):
            await rag.delete_by_entity(doc_id)
            return DeleteDocResponse(success=True, doc_id=doc_id, message="Deleted successfully")
        else:
            return DeleteDocResponse(success=False, doc_id=doc_id, message="Delete operation not supported by LightRAG version")
    except Exception as e:
        return DeleteDocResponse(success=False, doc_id=doc_id, message=str(e))
