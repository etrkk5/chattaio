from fastapi import APIRouter, HTTPException
from app.schemas.query import QueryRequest, QueryResponse
from app.core.rag_engine import get_rag
from app.core.logging import get_logger
from lightrag import QueryParam

logger = get_logger(__name__)
router = APIRouter()

@router.post("/query", response_model=QueryResponse, tags=["Query"])
async def query_rag(request: QueryRequest):
    try:
        rag = get_rag()
        
        result = await rag.aquery(
            request.question,
            param=QueryParam(mode=request.mode)
        )
        
        if isinstance(result, str):
            answer = result
        elif isinstance(result, dict) and 'answer' in result:
            answer = result['answer']
        else:
            answer = str(result)
            
        return QueryResponse(answer=answer)
    except Exception as e:
        logger.error("Query failed", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
