# Deployment Instructions

## Backend Deployment to Railway

Since you already have a Railway backend set up, follow these steps:

### Step 1: Link Railway Project
```bash
cd backend
railway link
# Select your StudyCompanion project from the list
```

### Step 2: Deploy Backend
```bash
railway up
```

This will:
- Build your Rails application
- Run database migrations automatically (via Procfile)
- Deploy to Railway

### Step 3: Get Backend URL
```bash
railway domain
# Or check Railway dashboard for the URL
```

### Step 4: Verify Environment Variables
Make sure these are set in Railway dashboard (Service > Variables):
- `RAILS_ENV=production`
- `RAILS_MASTER_KEY` (if using encrypted credentials)
- `SECRET_KEY_BASE`
- `DATABASE_URL` (auto-set by PostgreSQL addon)
- `CORS_ORIGINS` (update after frontend deployment)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` (for file uploads)

## Frontend Deployment to Vercel

### Step 1: Deploy Frontend
```bash
cd frontend
vercel --prod
```

### Step 2: Set Environment Variable in Vercel
In Vercel dashboard (Project Settings > Environment Variables):
- Add: `VITE_API_BASE_URL` = `https://your-railway-app.railway.app/api/v1`

### Step 3: Update CORS in Railway
After getting your Vercel URL, update Railway:
```bash
railway variables set CORS_ORIGINS=https://your-app.vercel.app
```

## Quick Deploy (Both)
```bash
./deploy.sh
# Select option 3
```

