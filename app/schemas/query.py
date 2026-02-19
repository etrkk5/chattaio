from pydantic import BaseModel, Field
from typing import Optional, Literal

class QueryRequest(BaseModel):
    question: str
    mode: Literal["hybrid", "local", "global", "naive"] = "hybrid"
    top_k: Optional[int] = Field(default=None, ge=1)
    
class QueryResponse(BaseModel):
    answer: str
