import asyncio
import os
import glob
from typing import Dict, Any, Optional
from uuid import uuid4
from datetime import datetime

import pymupdf4llm

from app.core.logging import get_logger
from app.core.rag_engine import get_rag
from app.core.settings import settings

logger = get_logger(__name__)

# Basic localized job store (in-memory for simple tasks)
_JOBS: Dict[str, Dict[str, Any]] = {}
_QUEUE: Optional[asyncio.Queue] = None
_WORKERS = []

def get_queue() -> asyncio.Queue:
    global _QUEUE
    if _QUEUE is None:
        _QUEUE = asyncio.Queue()
    return _QUEUE

def create_job(job_type: str, path: str) -> str:
    job_id = str(uuid4())
    _JOBS[job_id] = {
        "job_id": job_id,
        "job_type": job_type,  # 'file' or 'folder'
        "path": path,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "started_at": None,
        "completed_at": None,
        "error": None
    }
    return job_id

def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    return _JOBS.get(job_id)

def list_jobs() -> Dict[str, Any]:
    return _JOBS

async def process_single_file(file_path: str):
    rag = get_rag()
    ext = file_path.lower().split('.')[-1]
    
    logger.info(f"Processing file: {file_path}")
    text_content = ""
    if ext == 'pdf':
        try:
            # High-quality pdf to markdown converter handling tables, reading order, etc.
            text_content = pymupdf4llm.to_markdown(file_path)
        except Exception as e:
            logger.error(f"Failed to parse PDF {file_path}: {e}")
            raise e
    elif ext in ['txt', 'md', 'json', 'csv']:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
        except Exception as e:
            logger.error(f"Failed to read text file {file_path}: {e}")
            raise e
    else:
        logger.warning(f"Skipping unsupported file extension: {ext}")
        return
        
    if text_content.strip():
        # Insert textual content directly into LightRAG instance
        await rag.ainsert(input=text_content)
        logger.info(f"Successfully inserted content from {file_path} into LightRAG")
    else:
        logger.warning(f"Extracted content from {file_path} was empty.")

async def worker(worker_id: int):
    logger.info(f"Worker {worker_id} started")
    queue = get_queue()
    
    while True:
        try:
            job_id = await queue.get()
        except asyncio.CancelledError:
            logger.info(f"Worker {worker_id} cancelled while waiting for jobs")
            break
            
        try:
            job = _JOBS.get(job_id)
            if not job:
                queue.task_done()
                continue
                
            job["status"] = "processing"
            job["started_at"] = datetime.utcnow().isoformat()
            logger.info(f"Worker {worker_id} processing job {job_id}")
            
            if job["job_type"] == "file":
                await process_single_file(job["path"])
            elif job["job_type"] == "folder":
                # Process all files recursively in the folder
                folder_path = job["path"]
                for root, _, files in os.walk(folder_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # Filter out system files or hidden files
                        if not file.startswith('.'):
                            await process_single_file(file_path)
            
            job["status"] = "completed"
            job["completed_at"] = datetime.utcnow().isoformat()
            logger.info(f"Worker {worker_id} completed job {job_id}")
            
        except asyncio.CancelledError:
            logger.info(f"Worker {worker_id} cancelled during job processing")
            queue.task_done()
            break
        except Exception as e:
            logger.error(f"Worker {worker_id} failed on job {job_id}", exc_info=True)
            if job_id in _JOBS:
                _JOBS[job_id]["status"] = "failed"
                _JOBS[job_id]["error"] = str(e)
                _JOBS[job_id]["completed_at"] = datetime.utcnow().isoformat()
            queue.task_done()
        else:
            queue.task_done()

async def start_workers():
    logger.info(f"Starting {settings.ingest_concurrency} ingest workers")
    for i in range(settings.ingest_concurrency):
        task = asyncio.create_task(worker(i))
        _WORKERS.append(task)

async def stop_workers():
    logger.info("Stopping ingest workers")
    for task in _WORKERS:
        task.cancel()
    if _WORKERS:
        await asyncio.gather(*_WORKERS, return_exceptions=True)
    _WORKERS.clear()
