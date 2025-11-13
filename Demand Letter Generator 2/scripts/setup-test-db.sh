#!/bin/bash
# Quick setup script for testing

echo "Setting up test database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set in .env"
    echo "Please set DATABASE_URL in .env file"
    echo ""
    echo "For local PostgreSQL:"
    echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/demand_letter_generator?schema=public\""
    echo ""
    echo "For Vercel Postgres or Supabase, use their connection string"
    exit 1
fi

echo "✓ DATABASE_URL found"
echo ""

# Generate Prisma client
echo "Generating Prisma client..."
npm run db:generate

# Push schema to database
echo ""
echo "Pushing schema to database..."
npm run db:push

# Seed templates
echo ""
echo "Seeding templates..."
npx ts-node scripts/seed-templates.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "You can now start the dev server with: npm run dev"
echo "Then visit http://localhost:3000/login"
echo "Test login with any email and password: 123456"

