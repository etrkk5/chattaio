from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_llm_model: str = "gemini-2.0-flash"
    gemini_embed_model: str = "models/text-embedding-004"
    embedding_dim: int = 768
    lightrag_working_dir: str = "./rag_storage"
    lightrag_workspace: str = "default"
    
    milvus_uri: str = "http://localhost:19530"
    milvus_db_name: str = "lightrag"
    milvus_token: Optional[str] = None
    milvus_user: Optional[str] = None
    milvus_password: Optional[str] = None
    
    host: str = "0.0.0.0"
    port: int = 8000
    max_upload_mb: int = 100
    ingest_concurrency: int = 2
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
