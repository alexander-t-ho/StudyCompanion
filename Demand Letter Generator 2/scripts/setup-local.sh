#!/bin/bash

# Setup script for local development on port 3003

echo "🚀 Setting up Demand Letter Generator for local development..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp env.example .env
    echo "⚠️  Please update .env with your configuration (database, AWS, OpenRouter API key)"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Push database schema (for development)
echo "🗄️  Pushing database schema..."
npm run db:push

# Check if port 3003 is available
echo "🔍 Checking if port 3003 is available..."
if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3003 is already in use. You may need to stop the existing process."
    echo "   To find the process: lsof -i :3003"
    echo "   To kill it: kill -9 \$(lsof -t -i:3003)"
else
    echo "✅ Port 3003 is available"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update .env with your configuration"
echo "   2. Run: npm run dev"
echo "   3. Open: http://localhost:3003"
echo ""

