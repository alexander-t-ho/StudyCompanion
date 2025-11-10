# Quick Deployment Guide

## Issue Identified

The page goes empty because the frontend can't connect to the backend API. This happens when:
1. Backend server isn't running locally
2. API URL is incorrect
3. CORS issues

## Solution: Deploy to Production

### Step 1: Deploy Backend to Railway

```bash
cd backend

# Link project (if not already linked)
railway link

# Add PostgreSQL database
railway add postgresql

# Set environment variables
railway variables set RAILS_ENV=production

# Generate and set secrets
RAILS_SECRET=$(cd .. && cd backend && bundle exec rails secret 2>/dev/null || echo "generate-secret-here")
railway variables set RAILS_MASTER_KEY=$RAILS_SECRET
railway variables set SECRET_KEY_BASE=$RAILS_SECRET

# Set AWS credentials (if using S3)
railway variables set AWS_ACCESS_KEY_ID=your_key
railway variables set AWS_SECRET_ACCESS_KEY=your_secret
railway variables set AWS_REGION=us-east-1
railway variables set AWS_S3_BUCKET=your_bucket

# Deploy
railway up

# Get backend URL
BACKEND_URL=$(railway domain 2>/dev/null || echo "Check Railway dashboard")
echo "Backend URL: $BACKEND_URL"

# Seed database
railway run bundle exec rails db:seed RAILS_ENV=production
```

### Step 2: Deploy Frontend to Vercel

```bash
cd ../frontend

# Link project (if not already linked)
vercel link

# Deploy with backend URL (replace YOUR_RAILWAY_URL with actual URL)
vercel --prod -e VITE_API_BASE_URL="https://YOUR_RAILWAY_URL.railway.app/api/v1"

# Get frontend URL
FRONTEND_URL=$(vercel ls | grep -oP 'https://[^\s]+' | head -1)
echo "Frontend URL: $FRONTEND_URL"
```

### Step 3: Update CORS

```bash
cd ../backend

# Update CORS to allow Vercel domain (replace YOUR_VERCEL_URL)
railway variables set CORS_ORIGINS="https://YOUR_VERCEL_URL.vercel.app"

# Redeploy
railway up
```

## Testing

1. Visit your Vercel URL
2. Login with:
   - Username: `student 1`
   - Password: `123456`
3. Verify dashboard loads correctly

## Troubleshooting

**If page still goes empty:**
1. Check browser console for errors
2. Verify `VITE_API_BASE_URL` is set in Vercel
3. Check Network tab - are API calls going to correct URL?
4. Verify CORS_ORIGINS includes your Vercel URL exactly

**To check Railway logs:**
```bash
railway logs
```

**To check Vercel logs:**
```bash
vercel logs
```


