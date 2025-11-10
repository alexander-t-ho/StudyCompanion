#!/bin/bash

# Deployment script for Study Companion
# This script helps deploy both backend and frontend

set -e

echo "🚀 Study Companion Deployment Script"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    echo "Install it with: npm install -g vercel"
    exit 1
fi

echo -e "${GREEN}✅ Both Railway and Vercel CLI are installed${NC}"
echo ""

# Function to deploy backend
deploy_backend() {
    echo -e "${YELLOW}📦 Deploying Backend to Railway...${NC}"
    cd backend
    
    # Check if logged in to Railway
    if ! railway whoami &> /dev/null; then
        echo -e "${YELLOW}Please log in to Railway...${NC}"
        railway login
    fi
    
    # Link or create project
    if [ ! -f ".railway/railway.toml" ]; then
        echo -e "${YELLOW}Linking Railway project...${NC}"
        railway link
    fi
    
    # Deploy
    echo -e "${YELLOW}Deploying...${NC}"
    railway up
    
    # Get the deployed URL
    BACKEND_URL=$(railway domain 2>/dev/null || railway status | grep -oP 'https://[^\s]+' | head -1)
    
    if [ -z "$BACKEND_URL" ]; then
        echo -e "${YELLOW}⚠️  Could not automatically get backend URL. Please check Railway dashboard.${NC}"
        echo "After deployment, set BACKEND_URL environment variable and run this script again."
    else
        echo -e "${GREEN}✅ Backend deployed to: $BACKEND_URL${NC}"
        export BACKEND_URL
    fi
    
    cd ..
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "${YELLOW}📦 Deploying Frontend to Vercel...${NC}"
    cd frontend
    
    # Check if logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        echo -e "${YELLOW}Please log in to Vercel...${NC}"
        vercel login
    fi
    
    # Check if project is linked
    if [ ! -f ".vercel/project.json" ]; then
        echo -e "${YELLOW}Linking Vercel project...${NC}"
        vercel link
    fi
    
    # Deploy with environment variable if backend URL is set
    if [ -n "$BACKEND_URL" ]; then
        echo -e "${YELLOW}Deploying with API URL: ${BACKEND_URL}/api/v1${NC}"
        vercel --prod -e VITE_API_BASE_URL="${BACKEND_URL}/api/v1"
    else
        echo -e "${YELLOW}Deploying (you'll need to set VITE_API_BASE_URL in Vercel dashboard)${NC}"
        vercel --prod
    fi
    
    # Get the deployed URL
    FRONTEND_URL=$(vercel ls | grep -oP 'https://[^\s]+' | head -1)
    
    if [ -z "$FRONTEND_URL" ]; then
        echo -e "${YELLOW}⚠️  Could not automatically get frontend URL. Please check Vercel dashboard.${NC}"
    else
        echo -e "${GREEN}✅ Frontend deployed to: $FRONTEND_URL${NC}"
        export FRONTEND_URL
    fi
    
    cd ..
}

# Main deployment flow
echo "What would you like to deploy?"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both (Backend first, then Frontend)"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        deploy_backend
        ;;
    2)
        read -p "Enter your Railway backend URL (e.g., https://your-app.railway.app): " BACKEND_URL
        export BACKEND_URL
        deploy_frontend
        ;;
    3)
        deploy_backend
        echo ""
        if [ -n "$BACKEND_URL" ]; then
            echo -e "${YELLOW}⚠️  IMPORTANT: Update CORS_ORIGINS in Railway to include your Vercel URL after frontend deployment${NC}"
            echo ""
            read -p "Press Enter to continue with frontend deployment..."
            deploy_frontend
            
            if [ -n "$FRONTEND_URL" ] && [ -n "$BACKEND_URL" ]; then
                echo ""
                echo -e "${YELLOW}⚠️  Final Step: Update CORS in Railway${NC}"
                echo "Run this command to update CORS_ORIGINS:"
                echo "  railway variables set CORS_ORIGINS=$FRONTEND_URL"
            fi
        else
            echo -e "${YELLOW}⚠️  Could not get backend URL. Please deploy frontend manually.${NC}"
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"


