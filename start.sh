#!/bin/bash

# Ensure we exit smoothly on error
set -e

# Define cleanup procedure
cleanup() {
    echo -e "\n🛑 Stopping all Chatta.io services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Trap termination signals
trap cleanup SIGINT SIGTERM EXIT

echo "=========================================="
echo "🚀 Starting Chatta.io Production Launcher "
echo "=========================================="

# 1. Start Python Backend
echo "-> Starting FastAPI Backend (Port 8000)..."
if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "Error: Virtual environment (.venv) not found!"
    exit 1
fi
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 > backend.log 2>&1 &
BACKEND_PID=$!

# 2. Wait for Backend to initialize
sleep 3
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Error: Backend failed to start. Check backend.log."
    exit 1
fi

# 3. Start Next.js Frontend
echo "-> Starting Next.js Frontend (Port 3000)..."
cd frontend
if [ -d ".next" ]; then
    npm run start > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
else
    echo "Warning: Next.js production build not found. Building now..."
    npm run build
    npm run start > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
fi

# 4. Wait for Frontend to initialize
sleep 3
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Error: Frontend failed to start. Check frontend.log."
    exit 1
fi

echo ""
echo "✅ Both services are successfully running!"
echo "🌐 Frontend URL: http://localhost:3000"
echo "⚙️  Backend API: http://localhost:8000"
echo "📄 Backend Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to gracefully shut down the application."

# Keep script alive
wait

