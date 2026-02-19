import os
import hashlib
import json
import zipfile
import shutil
from fastapi import UploadFile
from datetime import datetime

from app.core.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

async def save_upload_file(upload_file: UploadFile, dest_dir: str) -> str:
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, upload_file.filename or "upload.tmp")
    
    # Save sequentially via stdlib buffer
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
            
    return file_path

def compute_sha256(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def get_manifest_path() -> str:
    return os.path.join(settings.lightrag_working_dir, "manifest.json")

def is_already_indexed(file_hash: str) -> bool:
    manifest_path = get_manifest_path()
    if not os.path.exists(manifest_path):
        return False
    with open(manifest_path, "r") as f:
        try:
            manifest = json.load(f)
            return file_hash in manifest
        except json.JSONDecodeError:
            return False

def mark_as_indexed(file_hash: str, file_path: str):
    manifest_path = get_manifest_path()
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, "r") as f:
            try:
                manifest = json.load(f)
            except json.JSONDecodeError:
                pass
            
    manifest[file_hash] = {
        "path": file_path,
        "indexed_at": datetime.utcnow().isoformat()
    }
    
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

def extract_zip(zip_path: str, extract_to: str):
    os.makedirs(extract_to, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
