#!/bin/bash
# StudyCompanion CLI - Server Management Tool

# Get script directory and set project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"

# Configuration
BACKEND_PORT=3002
FRONTEND_PORT=3001
BACKEND_LOG="/tmp/studycompanion_backend.log"
FRONTEND_LOG="/tmp/studycompanion_frontend.log"
STARTUP_WAIT_TIME=5
STOP_WAIT_TIME=2

# Colors
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Helper functions
print_usage() {
    cat << EOF
StudyCompanion CLI - Server Management

Usage: ./sc [command] [options]

Commands:
  start              Start both backend and frontend servers
  stop               Stop both servers
  restart            Restart both servers
  status             Show server status
  logs [--backend|--frontend]  Show server logs
  backend [start|stop|restart] Manage backend server only
  frontend [start|stop|restart] Manage frontend server only
  help               Show this help message

Examples:
  ./sc start                    # Start both servers
  ./sc stop                     # Stop both servers
  ./sc status                   # Check server status
  ./sc logs --backend           # Show backend logs
  ./sc logs --frontend          # Show frontend logs
  ./sc backend start            # Start backend only
  ./sc frontend stop            # Stop frontend only
  ./sc restart                  # Restart both servers
EOF
}

# Logging helpers
log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

log_warning() {
    echo -e "${YELLOW}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}" >&2
}

# Port management
check_port() {
    local port=$1
    lsof -ti:"$port" > /dev/null 2>&1
}

get_pid() {
    local port=$1
    lsof -ti:"$port" 2>/dev/null || echo ""
}

kill_port() {
    local port=$1
    local pid
    pid=$(lsof -ti:"$port" 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -9 "$pid" 2>/dev/null || true
        return 0
    fi
    return 1
}

start_backend() {
    if check_port "$BACKEND_PORT"; then
        log_warning "⚠️  Backend already running on port $BACKEND_PORT"
        return 0
    fi

    log_info "📦 Starting backend on port $BACKEND_PORT..."
    
    if [ ! -d "$PROJECT_ROOT/backend" ]; then
        log_error "❌ Backend directory not found: $PROJECT_ROOT/backend"
        return 1
    fi
    
    cd "$PROJECT_ROOT/backend" || {
        log_error "❌ Failed to change to backend directory"
        return 1
    }
    
    # Remove old PID file
    rm -f "$PROJECT_ROOT/backend/tmp/pids/server.pid" 2>/dev/null || true
    
    # Initialize rbenv and start Rails
    if command -v rbenv > /dev/null 2>&1; then
        eval "$(rbenv init -)"
    fi
    
    PORT=$BACKEND_PORT bundle exec rails server > "$BACKEND_LOG" 2>&1 &
    local backend_pid=$!
    
    echo "   Backend PID: $backend_pid"
    sleep "$STARTUP_WAIT_TIME"
    
    if check_port "$BACKEND_PORT"; then
        log_success "✅ Backend is running on port $BACKEND_PORT"
        return 0
    else
        log_error "❌ Backend failed to start. Check logs: tail -f $BACKEND_LOG"
        return 1
    fi
}

start_frontend() {
    if check_port "$FRONTEND_PORT"; then
        log_warning "⚠️  Frontend already running on port $FRONTEND_PORT"
        return 0
    fi

    log_info "📦 Starting frontend on port $FRONTEND_PORT..."
    
    if [ ! -d "$PROJECT_ROOT/frontend" ]; then
        log_error "❌ Frontend directory not found: $PROJECT_ROOT/frontend"
        return 1
    fi
    
    cd "$PROJECT_ROOT/frontend" || {
        log_error "❌ Failed to change to frontend directory"
        return 1
    }
    
    # Initialize nvm and start Vite
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        source "$HOME/.nvm/nvm.sh"
        nvm use 18 > /dev/null 2>&1 || nvm use default > /dev/null 2>&1
    fi
    
    if ! command -v npm > /dev/null 2>&1; then
        log_error "❌ npm not found. Please install Node.js"
        return 1
    fi
    
    npm run dev > "$FRONTEND_LOG" 2>&1 &
    local frontend_pid=$!
    
    echo "   Frontend PID: $frontend_pid"
    sleep "$STARTUP_WAIT_TIME"
    
    if check_port "$FRONTEND_PORT"; then
        log_success "✅ Frontend is running on port $FRONTEND_PORT"
        return 0
    else
        log_warning "⚠️  Frontend may have issues. Check logs: tail -f $FRONTEND_LOG"
        return 1
    fi
}

stop_backend() {
    if ! check_port "$BACKEND_PORT"; then
        log_warning "⚠️  Backend is not running"
        return 0
    fi

    log_info "🛑 Stopping backend on port $BACKEND_PORT..."
    kill_port "$BACKEND_PORT"
    rm -f "$PROJECT_ROOT/backend/tmp/pids/server.pid" 2>/dev/null || true
    sleep "$STOP_WAIT_TIME"
    
    if ! check_port "$BACKEND_PORT"; then
        log_success "✅ Backend stopped"
        return 0
    else
        log_error "❌ Failed to stop backend"
        return 1
    fi
}

stop_frontend() {
    if ! check_port "$FRONTEND_PORT"; then
        log_warning "⚠️  Frontend is not running"
        return 0
    fi

    log_info "🛑 Stopping frontend on port $FRONTEND_PORT..."
    kill_port "$FRONTEND_PORT"
    sleep "$STOP_WAIT_TIME"
    
    if ! check_port "$FRONTEND_PORT"; then
        log_success "✅ Frontend stopped"
        return 0
    else
        log_error "❌ Failed to stop frontend"
        return 1
    fi
}

show_status() {
    log_info "📊 Server Status"
    echo ""
    
    # Backend status
    local backend_pid
    if check_port "$BACKEND_PORT"; then
        backend_pid=$(get_pid "$BACKEND_PORT")
        log_success "✅ Backend"
        echo "   Port: $BACKEND_PORT"
        echo "   PID: $backend_pid"
        echo "   URL: http://localhost:$BACKEND_PORT"
    else
        log_error "❌ Backend"
        echo "   Status: Not running"
    fi
    
    echo ""
    
    # Frontend status
    local frontend_pid
    if check_port "$FRONTEND_PORT"; then
        frontend_pid=$(get_pid "$FRONTEND_PORT")
        log_success "✅ Frontend"
        echo "   Port: $FRONTEND_PORT"
        echo "   PID: $frontend_pid"
        echo "   URL: http://localhost:$FRONTEND_PORT"
    else
        log_error "❌ Frontend"
        echo "   Status: Not running"
    fi
    
    echo ""
    
    # Access info
    if check_port "$BACKEND_PORT" && check_port "$FRONTEND_PORT"; then
        log_success "🌐 Access the app at: http://localhost:$FRONTEND_PORT"
    fi
}

show_logs() {
    local log_type=$1
    
    case "$log_type" in
        --backend|"")
            if [ -f "$BACKEND_LOG" ]; then
                log_info "📋 Backend Logs (Ctrl+C to exit)"
                tail -f "$BACKEND_LOG"
            else
                log_error "❌ Backend log file not found: $BACKEND_LOG"
                return 1
            fi
            ;;
        --frontend)
            if [ -f "$FRONTEND_LOG" ]; then
                log_info "📋 Frontend Logs (Ctrl+C to exit)"
                tail -f "$FRONTEND_LOG"
            else
                log_error "❌ Frontend log file not found: $FRONTEND_LOG"
                return 1
            fi
            ;;
        *)
            log_error "❌ Invalid log option. Use --backend or --frontend"
            return 1
            ;;
    esac
}

# Main command handling
main() {
    case "${1:-}" in
        start)
            log_success "🚀 Starting StudyCompanion Servers..."
            echo ""
            start_backend
            echo ""
            start_frontend
            echo ""
            show_status
            ;;
        stop)
            log_warning "🛑 Stopping StudyCompanion Servers..."
            echo ""
            stop_backend
            echo ""
            stop_frontend
            ;;
        restart)
            log_warning "🔄 Restarting StudyCompanion Servers..."
            echo ""
            stop_backend
            stop_frontend
            sleep "$STOP_WAIT_TIME"
            echo ""
            start_backend
            echo ""
            start_frontend
            echo ""
            show_status
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        backend)
            case "${2:-}" in
                start)
                    start_backend
                    ;;
                stop)
                    stop_backend
                    ;;
                restart)
                    stop_backend
                    sleep "$STOP_WAIT_TIME"
                    start_backend
                    ;;
                *)
                    log_error "❌ Invalid backend command. Use: start, stop, or restart"
                    print_usage
                    exit 1
                    ;;
            esac
            ;;
        frontend)
            case "${2:-}" in
                start)
                    start_frontend
                    ;;
                stop)
                    stop_frontend
                    ;;
                restart)
                    stop_frontend
                    sleep "$STOP_WAIT_TIME"
                    start_frontend
                    ;;
                *)
                    log_error "❌ Invalid frontend command. Use: start, stop, or restart"
                    print_usage
                    exit 1
                    ;;
            esac
            ;;
        help|--help|-h|"")
            print_usage
            ;;
        *)
            log_error "❌ Unknown command: $1"
            echo ""
            print_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

