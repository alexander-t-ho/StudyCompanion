#!/bin/bash
# Start both backend and frontend servers for StudyCompanion

echo "🚀 Starting StudyCompanion Development Servers..."
echo ""

# Check if backend is already running
if lsof -ti:3002 > /dev/null 2>&1; then
    echo "✅ Backend already running on port 3002"
else
    echo "📦 Starting backend server on port 3002..."
    cd "$(dirname "$0")/backend"
    eval "$(rbenv init -)"
    PORT=3002 bundle exec rails server > /tmp/studycompanion_backend.log 2>&1 &
    BACKEND_PID=$!
    echo "   Backend PID: $BACKEND_PID"
    echo "   Logs: tail -f /tmp/studycompanion_backend.log"
    sleep 3
fi

# Check if frontend is already running
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Frontend already running on port 3000"
else
    echo "📦 Starting frontend server on port 3000..."
    cd "$(dirname "$0")/frontend"
    npm run dev > /tmp/studycompanion_frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   Frontend PID: $FRONTEND_PID"
    echo "   Logs: tail -f /tmp/studycompanion_frontend.log"
    sleep 5
fi

echo ""
echo "✅ Servers should be running!"
echo ""
echo "📍 Access the app at: http://localhost:3000"
echo "📍 Backend API at: http://localhost:3002"
echo ""
echo "To view logs:"
echo "  Backend:  tail -f /tmp/studycompanion_backend.log"
echo "  Frontend: tail -f /tmp/studycompanion_frontend.log"
echo ""
echo "To stop servers:"
echo "  kill \$(lsof -ti:3002)  # Backend"
echo "  kill \$(lsof -ti:3000)  # Frontend"

