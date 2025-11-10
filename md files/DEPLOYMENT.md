# Production Deployment Guide

## Backend Deployment (Railway)

### 1. Create Railway Project
1. Go to [Railway](https://railway.app) and create a new project
2. Connect your GitHub repository or deploy from local
3. Add PostgreSQL addon from Railway's database section

### 2. Configure Environment Variables in Railway
Set these in Railway dashboard under your service's Variables tab:

**Required:**
- `RAILS_ENV=production`
- `RAILS_MASTER_KEY` - Generate with: `cd backend && rails secret`
- `SECRET_KEY_BASE` - Generate with: `cd backend && rails secret`
- `DATABASE_URL` - Auto-provided by PostgreSQL addon
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `AWS_REGION` - e.g., `us-east-1`
- `AWS_S3_BUCKET` - Your S3 bucket name

**Optional:**
- `OPENAI_API_KEY` - If you want to set default API key
- `OPENROUTER_API_KEY` - If using OpenRouter
- `USE_OPENROUTER=false` - Set to `true` if using OpenRouter
- `CORS_ORIGINS` - Comma-separated list of allowed origins (e.g., `https://your-app.vercel.app,https://www.yourdomain.com`)
- `REDIS_URL` - If using Sidekiq, add Redis addon and use provided URL
- `RAILS_MAX_THREADS=5` - Optional, defaults to 5
- `PORT` - Railway sets this automatically

### 3. Deploy Backend
1. Railway will automatically detect the Rails app from the `Procfile`
2. The `release` command in Procfile will run migrations automatically
3. After deployment, run seed data manually:
   ```bash
   railway run rails db:seed RAILS_ENV=production
   ```

### 4. Get Backend URL
- Railway will provide a URL like: `https://your-app.railway.app`
- Note this URL for frontend configuration

## Frontend Deployment (Vercel)

### 1. Create Vercel Project
1. Go to [Vercel](https://vercel.com) and create a new project
2. Connect your GitHub repository
3. Set root directory to `frontend/`
4. Framework preset: Vite

### 2. Configure Build Settings
Vercel should auto-detect these, but verify:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Configure Environment Variables in Vercel
Set these in Vercel dashboard under your project's Settings > Environment Variables:

**Required:**
- `VITE_API_BASE_URL` - Your Railway backend URL + `/api/v1` (e.g., `https://your-app.railway.app/api/v1`)

### 4. Deploy Frontend
1. Vercel will automatically deploy on push to main branch
2. After deployment, update Railway's `CORS_ORIGINS` to include your Vercel URL

## Post-Deployment

### 1. Update CORS Settings
After getting your Vercel URL, update Railway environment variable:
- `CORS_ORIGINS=https://your-app.vercel.app`

### 2. Seed Database
Run the seed script to create initial users:
```bash
railway run rails db:seed RAILS_ENV=production
```

### 3. Test Deployment
- Test login with: username `student 1`, password `123456`
- Test admin login with: username `admin`, password `123456`
- Verify file uploads work (S3 integration)
- Test all major features and animations

## Troubleshooting

### Backend Issues
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure DATABASE_URL is correct
- Check that migrations ran successfully

### Frontend Issues
- Verify `VITE_API_BASE_URL` is set correctly
- Check browser console for CORS errors
- Ensure Vercel build completed successfully
- Verify API calls are going to correct backend URL

### Database Issues
- Verify PostgreSQL addon is running
- Check DATABASE_URL format
- Ensure migrations have run
- Verify seed data was created

## Custom Domains (Optional)

### Railway Custom Domain
1. Go to Railway project settings
2. Add custom domain
3. Update DNS records as instructed

### Vercel Custom Domain
1. Go to Vercel project settings
2. Add custom domain
3. Update DNS records as instructed
4. Update Railway `CORS_ORIGINS` to include custom domain

