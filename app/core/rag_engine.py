import os
from typing import Optional

from lightrag import LightRAG
from lightrag.llm.gemini import gemini_model_complete, gemini_embed
from lightrag.utils import EmbeddingFunc

from app.core.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Global singletons
_rag_instance: Optional[LightRAG] = None

async def init_rag_engine() -> LightRAG:
    global _rag_instance
    
    if _rag_instance is not None:
        return _rag_instance

    logger.info("Initializing LightRAG with Gemini + Milvus")
    
    working_dir = settings.lightrag_working_dir
    os.makedirs(working_dir, exist_ok=True)
    
    # LightRAG STRICTLY validates os.environ for Milvus variables during __post_init__
    os.environ["MILVUS_URI"] = settings.milvus_uri
    os.environ["MILVUS_DB_NAME"] = settings.milvus_db_name
    if settings.milvus_token:
        os.environ["MILVUS_TOKEN"] = settings.milvus_token
    elif settings.milvus_user and settings.milvus_password:
        os.environ["MILVUS_USER"] = settings.milvus_user
        os.environ["MILVUS_PASSWORD"] = settings.milvus_password
    
    # Setup embedding function
    embedding_func = EmbeddingFunc(
        embedding_dim=settings.embedding_dim,
        max_token_size=8192,
        send_dimensions=True,
        func=gemini_embed.func
    )
    
    vector_kwargs = {
        "uri": settings.milvus_uri,
        "db_name": settings.milvus_db_name,
        "collection_name": f"{settings.lightrag_workspace}_collection"
    }
    if settings.milvus_token:
        vector_kwargs["token"] = settings.milvus_token
    elif settings.milvus_user and settings.milvus_password:
        vector_kwargs["user"] = settings.milvus_user
        vector_kwargs["password"] = settings.milvus_password

    # Initialize LightRAG
    _rag_instance = LightRAG(
        working_dir=working_dir,
        workspace=settings.lightrag_workspace,
        llm_model_func=gemini_model_complete,
        llm_model_name=settings.gemini_llm_model,
        llm_model_max_async=2, # Limit concurrency to survive Gemini Free Tier RPM (15)
        embedding_func=embedding_func,
        embedding_batch_num=16,
        embedding_func_max_async=2, # Limit concurrency to survive Gemini Free Tier RPM (15) # Limit concurrency
        vector_storage="MilvusVectorDBStorage",
        vector_db_storage_cls_kwargs=vector_kwargs
    )
    
    # Important: Called once at startup
    logger.info("Initializing LightRAG storages...")
    await _rag_instance.initialize_storages()
    
    return _rag_instance

def get_rag() -> LightRAG:
    if _rag_instance is None:
        raise RuntimeError("LightRAG is not initialized")
    return _rag_instance
