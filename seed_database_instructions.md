# Database Seeding Instructions

## Option 1: Via Railway Dashboard (Recommended)

1. **Open Railway Dashboard:**
   - Go to: https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb/service/1440f69c-6bea-45ee-a246-5fef6266f778

2. **Open Service Shell:**
   - Click on your backend service
   - Click on the "Deployments" tab
   - Click on the latest deployment
   - Look for "View Logs" or "Shell" button
   - Or go to the service → Click "Connect" or "Shell" tab

3. **Run Seed Command:**
   ```bash
   rails db:seed RAILS_ENV=production
   ```

## Option 2: Via Railway CLI (if SSH is available)

```bash
cd backend
railway ssh
rails db:seed RAILS_ENV=production
exit
```

## What the seed creates:
- Default student user: username `student 1`, password `123456`
- Admin user: username `admin`, password `123456`
- Sample data for testing

