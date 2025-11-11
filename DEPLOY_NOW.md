# Quick Deployment Guide

## Backend Deployment (Railway)

Since you already have a Railway backend set up, follow these steps:

### 1. Link Railway Project (if not already linked)
```bash
cd backend
railway link
# Select your existing Railway project
```

### 2. Deploy Backend
```bash
cd backend
railway up
```

This will:
- Build your Rails application
- Run database migrations (via Procfile release command)
- Deploy to Railway

### 3. Get Backend URL
After deployment, get your backend URL:
```bash
railway domain
# Or check Railway dashboard for the URL
```

### 4. Update Environment Variables (if needed)
Make sure these are set in Railway dashboard:
- `RAILS_ENV=production`
- `RAILS_MASTER_KEY` (if using encrypted credentials)
- `SECRET_KEY_BASE`
- `DATABASE_URL` (auto-set by PostgreSQL addon)
- `CORS_ORIGINS` (will update after frontend deployment)
- `OPENAI_API_KEY` (optional, for default API key)
- `OPENROUTER_API_KEY` (optional)
- `USE_OPENROUTER=false`

## Frontend Deployment (Vercel)

### 1. Deploy to Vercel
```bash
cd frontend
vercel --prod
```

### 2. Set Environment Variable
In Vercel dashboard, set:
- `VITE_API_BASE_URL` = `https://your-railway-app.railway.app/api/v1`

### 3. Update CORS in Railway
After getting your Vercel URL, update Railway:
```bash
railway variables set CORS_ORIGINS=https://your-app.vercel.app
```

## Quick Deploy Script

You can also use the automated script:
```bash
./deploy.sh
# Select option 3 for both backend and frontend
```

