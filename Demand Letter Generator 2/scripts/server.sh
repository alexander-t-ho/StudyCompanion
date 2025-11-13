#!/bin/bash
# Server management script
# Usage: ./scripts/server.sh [start|stop|status|restart]

PORT=3003
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

case "$1" in
  start)
    echo "🚀 Starting server on port $PORT..."
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "⚠️  Port $PORT is already in use"
      echo "   Use './scripts/server.sh stop' to stop the existing server"
      exit 1
    fi
    npm run dev
    ;;
  stop)
    echo "🛑 Stopping server on port $PORT..."
    PID=$(lsof -t -i:$PORT 2>/dev/null)
    if [ -z "$PID" ]; then
      echo "ℹ️  No server running on port $PORT"
    else
      kill -9 $PID
      echo "✅ Server stopped (PID: $PID)"
    fi
    ;;
  status)
    echo "📊 Server Status"
    echo "================"
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
      PID=$(lsof -t -i:$PORT)
      echo "✅ Server is running on port $PORT (PID: $PID)"
      if curl -s http://localhost:$PORT > /dev/null 2>&1; then
        echo "✅ Server is responding"
      else
        echo "⚠️  Server is running but not responding"
      fi
    else
      echo "❌ Server is not running"
    fi
    ;;
  restart)
    echo "🔄 Restarting server..."
    ./scripts/server.sh stop
    sleep 2
    ./scripts/server.sh start
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the development server"
    echo "  stop    - Stop the running server"
    echo "  status  - Check server status"
    echo "  restart - Restart the server"
    exit 1
    ;;
esac

