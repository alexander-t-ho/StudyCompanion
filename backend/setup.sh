#!/bin/bash
# Platform Integration Setup Script

set -e

echo "============================================================"
echo "Platform Integration Setup"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Install dependencies
echo "Step 1: Installing Ruby dependencies..."
if bundle install; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    echo "You may need to:"
    echo "  - Install Ruby 2.7.0+ (current: $(ruby --version))"
    echo "  - Or use Rails 6.1 (already configured in Gemfile)"
    exit 1
fi
echo ""

# Step 2: Check PostgreSQL
echo "Step 2: Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL found${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not found - install it first${NC}"
fi
echo ""

# Step 3: Create database
echo "Step 3: Creating database..."
if rails db:create 2>&1; then
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${YELLOW}⚠ Database creation failed or already exists${NC}"
fi
echo ""

# Step 4: Run migrations
echo "Step 4: Running migrations..."
if rails db:migrate 2>&1; then
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}✗ Migrations failed${NC}"
    exit 1
fi
echo ""

# Step 5: Seed data
echo "Step 5: Seeding test data..."
if rails db:seed 2>&1; then
    echo -e "${GREEN}✓ Test data seeded${NC}"
    echo ""
    echo "Test student created:"
    echo "  Email: test@example.com"
    echo "  Check output above for authentication token"
else
    echo -e "${YELLOW}⚠ Seeding failed or already seeded${NC}"
fi
echo ""

# Step 6: Check Redis
echo "Step 6: Checking Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping 2>&1 | grep -q PONG; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${YELLOW}⚠ Redis not running - start it with: redis-server${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Redis not found - install it for background jobs${NC}"
fi
echo ""

echo "============================================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Start Redis: redis-server"
echo "2. Start Sidekiq: bundle exec sidekiq"
echo "3. Start Rails: rails server"
echo "4. Test endpoints: ./validate_api_endpoints.sh"
echo ""

