#!/bin/bash
# Script to start both frontend and backend servers

echo "🚀 Starting Study Companion Servers..."
echo ""

# Start Backend (Rails API) on port 3004
echo "Starting backend on port 3004..."
cd "$(dirname "$0")/backend"
eval "$(rbenv init - zsh)"
bundle exec rails server -p 3004 > /tmp/rails_3004.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"
echo ""

# Wait a moment for backend to start
sleep 3

# Start Frontend (Vite/React) on port 3002
echo "Starting frontend on port 3002..."
cd "$(dirname "$0")/frontend"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use default >/dev/null 2>&1
fi
npm run dev > /tmp/frontend_3002.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"
echo ""

# Wait for servers to start
sleep 5

echo "✅ Servers starting..."
echo ""
echo "🌐 Frontend: http://localhost:3002"
echo "🔧 Backend:  http://localhost:3004"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/rails_3004.log"
echo "  Frontend: tail -f /tmp/frontend_3002.log"
echo ""
echo "To stop servers:"
echo "  kill $BACKEND_PID $FRONTEND_PID"

