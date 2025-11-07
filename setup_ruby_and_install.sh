#!/bin/bash
# Complete Setup Script for Study Companion

set -e

echo "============================================================"
echo "Study Companion - Complete Setup"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Check/Install rbenv
echo -e "${BLUE}Step 1: Checking rbenv...${NC}"
if command -v rbenv &> /dev/null; then
    echo -e "${GREEN}✓ rbenv found${NC}"
else
    echo -e "${YELLOW}Installing rbenv...${NC}"
    brew install rbenv ruby-build
    eval "$(rbenv init - zsh)"
fi
echo ""

# Step 2: Check/Install Ruby 3.2.0
echo -e "${BLUE}Step 2: Checking Ruby 3.2.0...${NC}"
eval "$(rbenv init - zsh)"
if rbenv versions | grep -q "3.2.0"; then
    echo -e "${GREEN}✓ Ruby 3.2.0 already installed${NC}"
else
    echo -e "${YELLOW}Installing Ruby 3.2.0 (this may take 5-10 minutes)...${NC}"
    rbenv install 3.2.0
fi

rbenv global 3.2.0
eval "$(rbenv init - zsh)"
echo -e "${GREEN}✓ Using Ruby $(ruby -v)${NC}"
echo ""

# Step 3: Install bundler
echo -e "${BLUE}Step 3: Installing bundler...${NC}"
gem install bundler
echo -e "${GREEN}✓ Bundler installed${NC}"
echo ""

# Step 4: Install backend dependencies
echo -e "${BLUE}Step 4: Installing backend dependencies...${NC}"
cd backend
bundle install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Step 5: Check PostgreSQL
echo -e "${BLUE}Step 5: Checking PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    if pg_isready &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL not running - start it with: brew services start postgresql${NC}"
    fi
else
    echo -e "${YELLOW}⚠ PostgreSQL not found - install with: brew install postgresql${NC}"
fi
echo ""

# Step 6: Create database
echo -e "${BLUE}Step 6: Setting up database...${NC}"
if rails db:create 2>&1; then
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${YELLOW}⚠ Database creation failed or already exists${NC}"
fi

if rails db:migrate 2>&1; then
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}✗ Migrations failed${NC}"
    exit 1
fi

if rails db:seed 2>&1; then
    echo -e "${GREEN}✓ Test data seeded${NC}"
else
    echo -e "${YELLOW}⚠ Seeding failed or already seeded${NC}"
fi
echo ""

# Step 7: Check Redis
echo -e "${BLUE}Step 7: Checking Redis...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping 2>&1 | grep -q PONG; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠ Redis not running - start it with: brew services start redis${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Redis not found - install with: brew install redis${NC}"
fi
echo ""

# Step 8: Install frontend dependencies
echo -e "${BLUE}Step 8: Installing frontend dependencies...${NC}"
cd ../frontend
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ package.json not found${NC}"
fi
echo ""

echo "============================================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "============================================================"
echo ""
echo "Next steps to start the application:"
echo ""
echo "1. Start Redis (if not running):"
echo "   brew services start redis"
echo ""
echo "2. Start Sidekiq (Terminal 1):"
echo "   cd backend && bundle exec sidekiq"
echo ""
echo "3. Start Rails server (Terminal 2):"
echo "   cd backend && rails server"
echo ""
echo "4. Start Frontend (Terminal 3):"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Open browser:"
echo "   http://localhost:3001 (or port shown by npm)"
echo ""
echo "6. Generate and review transcripts!"
echo ""

