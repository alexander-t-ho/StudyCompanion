#!/bin/bash
# Start StudyCompanion servers

echo "🚀 Starting StudyCompanion Servers..."
echo ""

# Kill any existing processes
echo "Cleaning up existing processes..."
kill -9 $(lsof -ti:3002) 2>/dev/null || true
kill -9 $(lsof -ti:3000) 2>/dev/null || true
rm -f /Users/alexho/StudyCompanion/backend/tmp/pids/server.pid 2>/dev/null || true

# Start Backend
echo "📦 Starting backend on port 3002..."
cd /Users/alexho/StudyCompanion/backend
eval "$(rbenv init -)"
PORT=3002 bundle exec rails server > /tmp/studycompanion_backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

# Check if backend started
if lsof -ti:3002 > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3002"
else
    echo "❌ Backend failed to start. Check logs: tail -f /tmp/studycompanion_backend.log"
    exit 1
fi

# Start Frontend
echo "📦 Starting frontend on port 3000..."
cd /Users/alexho/StudyCompanion/frontend
npm run dev > /tmp/studycompanion_frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 5

# Check if frontend started
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 3000"
else
    echo "⚠️  Frontend may have issues. Check logs: tail -f /tmp/studycompanion_frontend.log"
    echo "   Note: If you see Node.js library errors, you may need to fix your Node.js installation"
fi

echo ""
echo "✅ Servers started!"
echo ""
echo "📍 Access the app at: http://localhost:3000"
echo "📍 Backend API at: http://localhost:3002"
echo ""
echo "To view logs:"
echo "  Backend:  tail -f /tmp/studycompanion_backend.log"
echo "  Frontend: tail -f /tmp/studycompanion_frontend.log"
echo ""
echo "To stop servers:"
echo "  kill $BACKEND_PID  # Backend"
echo "  kill $FRONTEND_PID  # Frontend"
echo "  Or: kill \$(lsof -ti:3002) && kill \$(lsof -ti:3000)"
