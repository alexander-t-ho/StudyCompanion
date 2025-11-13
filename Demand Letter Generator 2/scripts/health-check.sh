#!/bin/bash
# Quick health check script
# Checks if server is running and database is accessible

echo "🏥 Health Check"
echo "==============="
echo ""

# Check if server is running
echo "Checking server status..."
if curl -s http://localhost:3003 > /dev/null 2>&1; then
    echo "✅ Server is running on http://localhost:3003"
else
    echo "❌ Server is not running"
    echo "   Start with: npm run dev"
fi
echo ""

# Check database connection
echo "Checking database connection..."
if npm run db:test > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "   Check your DATABASE_URL in .env"
fi
echo ""

# Check port
echo "Checking port 3003..."
if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID=$(lsof -t -i:3003)
    echo "✅ Port 3003 is in use (PID: $PID)"
else
    echo "⚠️  Port 3003 is not in use"
fi
echo ""

echo "For detailed setup check, run: npm run check-setup"

