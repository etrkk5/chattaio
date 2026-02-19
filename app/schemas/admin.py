from pydantic import BaseModel

class StatsResponse(BaseModel):
    workspace: str
    working_dir: str
    active_jobs: int
    completed_jobs: int
    failed_jobs: int

class DeleteDocResponse(BaseModel):
    success: bool
    doc_id: str
    message: str
