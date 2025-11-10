#!/bin/bash
# StudyCompanion CLI - Server Management Tool

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/alexho/StudyCompanion"
BACKEND_PORT=3002
FRONTEND_PORT=3000
BACKEND_LOG="/tmp/studycompanion_backend.log"
FRONTEND_LOG="/tmp/studycompanion_frontend.log"

# Helper functions
print_usage() {
    echo "StudyCompanion CLI - Server Management"
    echo ""
    echo "Usage: ./sc [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start both backend and frontend servers"
    echo "  stop        Stop both servers"
    echo "  restart     Restart both servers"
    echo "  status      Show server status"
    echo "  logs        Show server logs (use --backend or --frontend)"
    echo "  backend     Start/stop backend only (use with start/stop)"
    echo "  frontend    Start/stop frontend only (use with start/stop)"
    echo ""
    echo "Examples:"
    echo "  ./sc start              # Start both servers"
    echo "  ./sc stop               # Stop both servers"
    echo "  ./sc status             # Check server status"
    echo "  ./sc logs --backend     # Show backend logs"
    echo "  ./sc logs --frontend    # Show frontend logs"
    echo "  ./sc backend start      # Start backend only"
    echo "  ./sc frontend stop      # Stop frontend only"
}

check_port() {
    local port=$1
    lsof -ti:$port > /dev/null 2>&1
}

get_pid() {
    local port=$1
    lsof -ti:$port 2>/dev/null || echo ""
}

start_backend() {
    if check_port $BACKEND_PORT; then
        echo -e "${YELLOW}⚠️  Backend already running on port $BACKEND_PORT${NC}"
        return 0
    fi

    echo -e "${BLUE}📦 Starting backend on port $BACKEND_PORT...${NC}"
    cd "$PROJECT_ROOT/backend"
    
    # Remove old PID file
    rm -f "$PROJECT_ROOT/backend/tmp/pids/server.pid" 2>/dev/null || true
    
    # Initialize rbenv and start Rails
    eval "$(rbenv init -)"
    PORT=$BACKEND_PORT bundle exec rails server > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    
    echo -e "   Backend PID: $BACKEND_PID"
    sleep 5
    
    if check_port $BACKEND_PORT; then
        echo -e "${GREEN}✅ Backend is running on port $BACKEND_PORT${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend failed to start. Check logs: tail -f $BACKEND_LOG${NC}"
        return 1
    fi
}

start_frontend() {
    if check_port $FRONTEND_PORT; then
        echo -e "${YELLOW}⚠️  Frontend already running on port $FRONTEND_PORT${NC}"
        return 0
    fi

    echo -e "${BLUE}📦 Starting frontend on port $FRONTEND_PORT...${NC}"
    cd "$PROJECT_ROOT/frontend"
    
    # Initialize nvm and start Vite
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        source "$HOME/.nvm/nvm.sh"
        nvm use 18 > /dev/null 2>&1 || nvm use default > /dev/null 2>&1
    fi
    
    npm run dev > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    
    echo -e "   Frontend PID: $FRONTEND_PID"
    sleep 5
    
    if check_port $FRONTEND_PORT; then
        echo -e "${GREEN}✅ Frontend is running on port $FRONTEND_PORT${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Frontend may have issues. Check logs: tail -f $FRONTEND_LOG${NC}"
        return 1
    fi
}

stop_backend() {
    if ! check_port $BACKEND_PORT; then
        echo -e "${YELLOW}⚠️  Backend is not running${NC}"
        return 0
    fi

    echo -e "${BLUE}🛑 Stopping backend on port $BACKEND_PORT...${NC}"
    kill -9 $(lsof -ti:$BACKEND_PORT) 2>/dev/null || true
    rm -f "$PROJECT_ROOT/backend/tmp/pids/server.pid" 2>/dev/null || true
    sleep 2
    
    if ! check_port $BACKEND_PORT; then
        echo -e "${GREEN}✅ Backend stopped${NC}"
    else
        echo -e "${RED}❌ Failed to stop backend${NC}"
        return 1
    fi
}

stop_frontend() {
    if ! check_port $FRONTEND_PORT; then
        echo -e "${YELLOW}⚠️  Frontend is not running${NC}"
        return 0
    fi

    echo -e "${BLUE}🛑 Stopping frontend on port $FRONTEND_PORT...${NC}"
    kill -9 $(lsof -ti:$FRONTEND_PORT) 2>/dev/null || true
    sleep 2
    
    if ! check_port $FRONTEND_PORT; then
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    else
        echo -e "${RED}❌ Failed to stop frontend${NC}"
        return 1
    fi
}

show_status() {
    echo -e "${BLUE}📊 Server Status${NC}"
    echo ""
    
    # Backend status
    if check_port $BACKEND_PORT; then
        BACKEND_PID=$(get_pid $BACKEND_PORT)
        echo -e "${GREEN}✅ Backend${NC}"
        echo "   Port: $BACKEND_PORT"
        echo "   PID: $BACKEND_PID"
        echo "   URL: http://localhost:$BACKEND_PORT"
    else
        echo -e "${RED}❌ Backend${NC}"
        echo "   Status: Not running"
    fi
    
    echo ""
    
    # Frontend status
    if check_port $FRONTEND_PORT; then
        FRONTEND_PID=$(get_pid $FRONTEND_PORT)
        echo -e "${GREEN}✅ Frontend${NC}"
        echo "   Port: $FRONTEND_PORT"
        echo "   PID: $FRONTEND_PID"
        echo "   URL: http://localhost:$FRONTEND_PORT"
    else
        echo -e "${RED}❌ Frontend${NC}"
        echo "   Status: Not running"
    fi
    
    echo ""
    
    # Access info
    if check_port $BACKEND_PORT && check_port $FRONTEND_PORT; then
        echo -e "${GREEN}🌐 Access the app at: http://localhost:$FRONTEND_PORT${NC}"
    fi
}

show_logs() {
    local log_type=$1
    
    if [ "$log_type" == "--backend" ] || [ -z "$log_type" ]; then
        if [ -f "$BACKEND_LOG" ]; then
            echo -e "${BLUE}📋 Backend Logs (Ctrl+C to exit)${NC}"
            tail -f "$BACKEND_LOG"
        else
            echo -e "${RED}❌ Backend log file not found${NC}"
        fi
    elif [ "$log_type" == "--frontend" ]; then
        if [ -f "$FRONTEND_LOG" ]; then
            echo -e "${BLUE}📋 Frontend Logs (Ctrl+C to exit)${NC}"
            tail -f "$FRONTEND_LOG"
        else
            echo -e "${RED}❌ Frontend log file not found${NC}"
        fi
    else
        echo -e "${RED}❌ Invalid log option. Use --backend or --frontend${NC}"
        exit 1
    fi
}

# Main command handling
case "$1" in
    start)
        echo -e "${GREEN}🚀 Starting StudyCompanion Servers...${NC}"
        echo ""
        start_backend
        echo ""
        start_frontend
        echo ""
        show_status
        ;;
    stop)
        echo -e "${YELLOW}🛑 Stopping StudyCompanion Servers...${NC}"
        echo ""
        stop_backend
        echo ""
        stop_frontend
        ;;
    restart)
        echo -e "${YELLOW}🔄 Restarting StudyCompanion Servers...${NC}"
        echo ""
        stop_backend
        stop_frontend
        sleep 2
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
        case "$2" in
            start)
                start_backend
                ;;
            stop)
                stop_backend
                ;;
            restart)
                stop_backend
                sleep 2
                start_backend
                ;;
            *)
                echo -e "${RED}❌ Invalid backend command. Use: start, stop, or restart${NC}"
                exit 1
                ;;
        esac
        ;;
    frontend)
        case "$2" in
            start)
                start_frontend
                ;;
            stop)
                stop_frontend
                ;;
            restart)
                stop_frontend
                sleep 2
                start_frontend
                ;;
            *)
                echo -e "${RED}❌ Invalid frontend command. Use: start, stop, or restart${NC}"
                exit 1
                ;;
        esac
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        if [ -z "$1" ]; then
            print_usage
        else
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo ""
            print_usage
            exit 1
        fi
        ;;
esac

