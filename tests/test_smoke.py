import pytest
import os
import sys
from unittest.mock import patch, AsyncMock, MagicMock

# Ensure the root of the project is in the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# --- START MOCKING ---
# We must mock lightrag completely before it is imported by app.main
sys.modules['lightrag'] = MagicMock()
sys.modules['lightrag.llm'] = MagicMock()
sys.modules['lightrag.llm.gemini'] = MagicMock()
sys.modules['lightrag.utils'] = MagicMock()
# --- END MOCKING ---

from fastapi.testclient import TestClient

# Create an un-started mocked application instance
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "lightrag-backend"}

def test_query_mock():
    # Patch the function called inside query_rag route
    with patch("app.api.routes_query.get_rag") as mock_get_rag:
        
        mock_rag_instance = MagicMock()
        mock_aquery = AsyncMock(return_value="Mocked text answer")
        mock_rag_instance.aquery = mock_aquery
        
        mock_get_rag.return_value = mock_rag_instance

        # TestClient initiates the request
        response = client.post(
            "/api/v1/query", 
            json={
                "question": "test?",
                "mode": "hybrid"
            }
        )
        assert response.status_code == 200
        assert response.json() == {"answer": "Mocked text answer"}
