# Deployment Checklist

## Pre-Deployment
- [x] Create Procfile for Railway
- [x] Update database.yml to use DATABASE_URL
- [x] Update CORS settings in application.rb
- [x] Update vite.config.js for production
- [x] Create vercel.json configuration
- [x] Update API base URL to use environment variable

## Backend Deployment (Railway)

### Step 1: Create Railway Project
- [ ] Go to https://railway.app and sign in
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo" (or "Empty Project" to deploy manually)
- [ ] Select your StudyCompanion repository
- [ ] Railway will detect the Rails app automatically

### Step 2: Add PostgreSQL Database
- [ ] In Railway project, click "+ New"
- [ ] Select "Database" > "Add PostgreSQL"
- [ ] Railway will automatically create DATABASE_URL environment variable

### Step 3: Configure Environment Variables
Set these in Railway dashboard (Service > Variables):

**Required:**
- [ ] `RAILS_ENV=production`
- [ ] `RAILS_MASTER_KEY` - Run: `cd backend && rails secret` (copy the output)
- [ ] `SECRET_KEY_BASE` - Run: `cd backend && rails secret` (copy the output)
- [ ] `AWS_ACCESS_KEY_ID` - Your AWS access key
- [ ] `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- [ ] `AWS_REGION=us-east-1` (or your preferred region)
- [ ] `AWS_S3_BUCKET` - Your S3 bucket name

**Optional:**
- [ ] `OPENAI_API_KEY` - If you want default API key
- [ ] `OPENROUTER_API_KEY` - If using OpenRouter
- [ ] `USE_OPENROUTER=false` - Set to true if using OpenRouter
- [ ] `REDIS_URL` - If using Sidekiq, add Redis addon first

### Step 4: Deploy and Run Migrations
- [ ] Railway will automatically deploy when you push to main branch
- [ ] Or click "Deploy" button in Railway dashboard
- [ ] Migrations will run automatically via the `release` command in Procfile
- [ ] Check Railway logs to verify deployment succeeded

### Step 5: Seed Database
- [ ] In Railway dashboard, go to your service
- [ ] Click on "Deployments" tab
- [ ] Click on the latest deployment
- [ ] Click "View Logs" to see the terminal
- [ ] Run: `railway run rails db:seed RAILS_ENV=production`
- [ ] Or use Railway CLI: `railway run rails db:seed RAILS_ENV=production`

### Step 6: Get Backend URL
- [ ] In Railway dashboard, go to your service
- [ ] Click "Settings" > "Networking"
- [ ] Copy the generated domain (e.g., `https://your-app.railway.app`)
- [ ] Save this URL for frontend configuration

## Frontend Deployment (Vercel)

### Step 1: Create Vercel Project
- [ ] Go to https://vercel.com and sign in
- [ ] Click "Add New" > "Project"
- [ ] Import your GitHub repository
- [ ] Configure project:
  - **Root Directory**: `frontend`
  - **Framework Preset**: Vite
  - **Build Command**: `npm run build` (auto-detected)
  - **Output Directory**: `dist` (auto-detected)

### Step 2: Configure Environment Variables
- [ ] In Vercel project settings, go to "Environment Variables"
- [ ] Add: `VITE_API_BASE_URL` = `https://your-railway-backend.railway.app/api/v1`
  - Replace `your-railway-backend.railway.app` with your actual Railway URL

### Step 3: Deploy
- [ ] Click "Deploy"
- [ ] Vercel will build and deploy automatically
- [ ] Wait for deployment to complete
- [ ] Copy your Vercel URL (e.g., `https://your-app.vercel.app`)

### Step 4: Update CORS in Railway
- [ ] Go back to Railway dashboard
- [ ] Add environment variable: `CORS_ORIGINS`
- [ ] Set value to your Vercel URL: `https://your-app.vercel.app`
- [ ] Railway will automatically redeploy

## Post-Deployment Testing

### Authentication
- [ ] Test login with: username `student 1`, password `123456`
- [ ] Test admin login with: username `admin`, password `123456`
- [ ] Verify logout works

### Features
- [ ] Test subject navigation and exploded pages
- [ ] Test calendar/sessions view
- [ ] Test goals view
- [ ] Test practice problems
- [ ] Test homework help (AI chat)
- [ ] Test file uploads (images in AI chat)
- [ ] Verify all animations work correctly
- [ ] Test on mobile device (responsive design)

### Admin Features
- [ ] Test admin dashboard access
- [ ] Test student detail view
- [ ] Test study notes display

## Troubleshooting

### If backend won't start:
- Check Railway logs for errors
- Verify all required environment variables are set
- Ensure DATABASE_URL is correct
- Check that migrations ran successfully

### If frontend can't connect to backend:
- Verify VITE_API_BASE_URL is set correctly in Vercel
- Check browser console for CORS errors
- Update CORS_ORIGINS in Railway to include Vercel URL
- Verify Railway backend URL is accessible

### If file uploads fail:
- Verify AWS credentials are correct
- Check S3 bucket name is correct
- Verify S3 bucket permissions allow uploads
- Check Railway logs for S3 errors

