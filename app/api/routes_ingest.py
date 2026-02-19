from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import shutil

from app.core.ingest_queue import create_job, get_job_status, get_queue, list_jobs
from app.core.settings import settings
from app.core.logging import get_logger
from app.schemas.ingest import IngestResponse, JobStatusResponse
from app.utils.file_utils import save_upload_file, compute_sha256, is_already_indexed, mark_as_indexed, extract_zip
from app.utils.mime_detect import is_allowed_file

logger = get_logger(__name__)
router = APIRouter()

@router.post("/ingest/file", response_model=IngestResponse, tags=["Ingest"])
async def ingest_file(file: UploadFile = File(...)):
    if not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not supported.")
        
    temp_dir = os.path.join(settings.lightrag_working_dir, "temp_uploads")
    file_path = await save_upload_file(file, temp_dir)
    
    file_hash = compute_sha256(file_path)
    if is_already_indexed(file_hash):
        os.remove(file_path)
        return IngestResponse(job_id="", status="skipped", message="File already indexed.")
        
    job_id = create_job(job_type="file", path="")
    job_input_dir = os.path.join(settings.lightrag_working_dir, "inputs", job_id)
    os.makedirs(job_input_dir, exist_ok=True)
    
    final_path = os.path.join(job_input_dir, file.filename or "file")
    shutil.move(file_path, final_path)
    
    # Update job path
    list_jobs()[job_id]["path"] = final_path
    mark_as_indexed(file_hash, final_path)
    
    await get_queue().put(job_id)
    
    return IngestResponse(job_id=job_id, status="queued", message="File queued for ingestion.")

@router.post("/ingest/folder", response_model=IngestResponse, tags=["Ingest"])
async def ingest_folder(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed for folder ingestion.")
        
    job_id = create_job(job_type="folder", path="")
    job_input_dir = os.path.join(settings.lightrag_working_dir, "inputs", job_id)
    os.makedirs(job_input_dir, exist_ok=True)
    
    zip_path = await save_upload_file(file, job_input_dir)
    extract_dir = os.path.join(job_input_dir, "extracted")
    extract_zip(zip_path, extract_dir)
    
    list_jobs()[job_id]["path"] = extract_dir
    os.remove(zip_path)
    
    await get_queue().put(job_id)
    
    return IngestResponse(job_id=job_id, status="queued", message="Folder extracted and queued for ingestion.")

@router.get("/ingest/jobs/{job_id}", response_model=JobStatusResponse, tags=["Ingest"])
async def get_job(job_id: str):
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(**job)

@router.get("/admin/docs", tags=["Admin"])
async def list_docs():
    # Helper to retrieve manifest indicating docs that were already processed
    manifest_path = os.path.join(settings.lightrag_working_dir, "manifest.json")
    if os.path.exists(manifest_path):
        import json
        with open(manifest_path, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}
    return {}
