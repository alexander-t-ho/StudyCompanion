#!/bin/bash
# Initialize .env file from env.example if it doesn't exist

ENV_FILE=".env"
ENV_EXAMPLE="env.example"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        echo "📝 Creating .env file from env.example..."
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo "✅ Created .env file"
        echo ""
        echo "⚠️  IMPORTANT: Please update .env with your actual values:"
        echo "   - DATABASE_URL: Your PostgreSQL connection string"
        echo "   - JWT_SECRET: A secure random string"
        echo "   - OPENROUTER_API_KEY: Your OpenRouter API key"
        echo "   - AWS credentials (if using file uploads)"
        echo ""
    else
        echo "❌ Error: env.example not found"
        exit 1
    fi
else
    echo "ℹ️  .env file already exists"
fi

