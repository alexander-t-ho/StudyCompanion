# CLI Deployment Guide

This guide walks you through deploying Study Companion to production using Railway (backend) and Vercel (frontend) via CLI.

## Prerequisites

✅ Railway CLI installed: `npm install -g @railway/cli`  
✅ Vercel CLI installed: `npm install -g vercel`  
✅ Both are already installed on your system

## Quick Deploy

Run the deployment script:
```bash
./deploy.sh
```

Or follow the manual steps below.

## Manual Deployment Steps

### Step 1: Deploy Backend to Railway

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Login to Railway (if not already):**
   ```bash
   railway login
   ```

3. **Link or create Railway project:**
   ```bash
   railway link
   ```
   - If you have an existing project, select it
   - If not, create a new one

4. **Add PostgreSQL database:**
   ```bash
   railway add postgresql
   ```
   Railway will automatically set the `DATABASE_URL` environment variable.

5. **Set required environment variables:**
   ```bash
   # Generate secrets
   cd .. && cd backend
   RAILS_SECRET=$(rails secret)
   
   # Set environment variables
   railway variables set RAILS_ENV=production
   railway variables set RAILS_MASTER_KEY=$RAILS_SECRET
   railway variables set SECRET_KEY_BASE=$RAILS_SECRET
   
   # Set AWS credentials (if using S3)
   railway variables set AWS_ACCESS_KEY_ID=your_access_key
   railway variables set AWS_SECRET_ACCESS_KEY=your_secret_key
   railway variables set AWS_REGION=us-east-1
   railway variables set AWS_S3_BUCKET=your_bucket_name
   
   # Optional: Set API keys
   railway variables set OPENAI_API_KEY=your_key
   railway variables set OPENROUTER_API_KEY=your_key
   railway variables set USE_OPENROUTER=false
   ```

6. **Deploy:**
   ```bash
   railway up
   ```

7. **Get your backend URL:**
   ```bash
   railway domain
   ```
   Or check Railway dashboard. Save this URL (e.g., `https://your-app.railway.app`)

8. **Seed the database:**
   ```bash
   railway run rails db:seed RAILS_ENV=production
   ```

### Step 2: Deploy Frontend to Vercel

1. **Navigate to frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Login to Vercel (if not already):**
   ```bash
   vercel login
   ```

3. **Link or create Vercel project:**
   ```bash
   vercel link
   ```
   - Select your existing project or create a new one
   - Set root directory to `frontend` if prompted

4. **Deploy with environment variable:**
   ```bash
   # Replace YOUR_RAILWAY_URL with your actual Railway URL
   vercel --prod -e VITE_API_BASE_URL="https://YOUR_RAILWAY_URL.railway.app/api/v1"
   ```

   Or set it in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://YOUR_RAILWAY_URL.railway.app/api/v1`

5. **Get your frontend URL:**
   ```bash
   vercel ls
   ```
   Or check Vercel dashboard. Save this URL (e.g., `https://your-app.vercel.app`)

### Step 3: Update CORS Settings

1. **Update Railway CORS to allow your Vercel domain:**
   ```bash
   cd ../backend
   railway variables set CORS_ORIGINS="https://YOUR_VERCEL_URL.vercel.app"
   ```

2. **Redeploy backend (if needed):**
   ```bash
   railway up
   ```

## Post-Deployment

### Test Your Deployment

1. **Test login:**
   - Username: `student 1`
   - Password: `123456`

2. **Test admin login:**
   - Username: `admin`
   - Password: `123456`

3. **Verify features:**
   - Dashboard loads correctly
   - API calls work
   - No CORS errors in browser console

### Troubleshooting

**Backend Issues:**
- Check Railway logs: `railway logs`
- Verify all environment variables are set: `railway variables`
- Ensure database migrations ran: Check Railway deployment logs

**Frontend Issues:**
- Check browser console for errors
- Verify `VITE_API_BASE_URL` is set correctly in Vercel
- Check Network tab to see if API calls are going to correct URL
- Verify CORS_ORIGINS includes your Vercel URL

**CORS Errors:**
- Make sure `CORS_ORIGINS` in Railway includes your exact Vercel URL
- No trailing slashes in CORS_ORIGINS
- Redeploy backend after changing CORS_ORIGINS

## Environment Variables Reference

### Railway (Backend)
- `RAILS_ENV=production`
- `RAILS_MASTER_KEY` (generate with `rails secret`)
- `SECRET_KEY_BASE` (generate with `rails secret`)
- `DATABASE_URL` (auto-set by PostgreSQL addon)
- `CORS_ORIGINS` (your Vercel URL)
- `AWS_ACCESS_KEY_ID` (if using S3)
- `AWS_SECRET_ACCESS_KEY` (if using S3)
- `AWS_REGION` (if using S3)
- `AWS_S3_BUCKET` (if using S3)
- `OPENAI_API_KEY` (optional)
- `OPENROUTER_API_KEY` (optional)
- `USE_OPENROUTER` (optional, default: false)
- `REDIS_URL` (if using Sidekiq, add Redis addon)

### Vercel (Frontend)
- `VITE_API_BASE_URL` (your Railway URL + `/api/v1`)

## Updating Deployments

**Backend:**
```bash
cd backend
railway up
```

**Frontend:**
```bash
cd frontend
vercel --prod
```

## Useful Commands

**Railway:**
- `railway status` - Check deployment status
- `railway logs` - View logs
- `railway variables` - List all environment variables
- `railway run <command>` - Run command in Railway environment

**Vercel:**
- `vercel ls` - List deployments
- `vercel logs` - View logs
- `vercel env ls` - List environment variables
- `vercel inspect <url>` - Inspect a deployment


