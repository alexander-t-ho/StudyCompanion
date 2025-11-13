# Railway PostgreSQL Fix Instructions

## Issue
PostgreSQL backend has not been working for 3 days in Railway.

## Steps to Fix

### 1. Verify PostgreSQL Service is Added

1. Go to Railway Dashboard: https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb
2. Check if you see a PostgreSQL service in your project
3. If **NOT present**, add it:
   - Click "+ New" button
   - Select "Database" > "Add PostgreSQL"
   - Railway will automatically create `DATABASE_URL` environment variable

### 2. Verify DATABASE_URL is Set

1. Go to your backend service: https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb/service/1440f69c-6bea-45ee-a246-5fef6266f778
2. Click on "Variables" tab
3. Verify `DATABASE_URL` is set and looks like:
   ```
   postgresql://postgres:password@postgres.railway.internal:5432/railway
   ```
   OR
   ```
   postgresql://postgres:password@postgres-production-xxx.up.railway.app:5432/railway
   ```

### 3. Link PostgreSQL Service to Backend Service

If PostgreSQL service exists but isn't linked:
1. In Railway dashboard, go to your backend service
2. Click "Settings" > "Networking"
3. Under "Private Networking", ensure PostgreSQL service is connected
4. Or go to PostgreSQL service > "Settings" > "Networking" and connect to backend service

### 4. Test Database Connection

After deployment, check logs:
1. Go to backend service > "Deployments" > Latest deployment
2. Check "Release" phase logs for:
   - "Database created" or "Database already exists"
   - "Running migrations"
   - Any connection errors

### 5. Manual Database Setup (if needed)

If automatic setup fails, use Railway Shell:
1. Go to backend service > "Deployments" > Latest deployment
2. Click "Shell" or "Connect"
3. Run:
   ```bash
   bundle exec rails db:create RAILS_ENV=production
   bundle exec rails db:migrate RAILS_ENV=production
   bundle exec rails db:seed RAILS_ENV=production
   ```

## Current Configuration

- **DATABASE_URL**: Should be auto-set by Railway PostgreSQL service
- **Release Command**: `bundle exec rails db:create 2>/dev/null || true && bundle exec rails db:migrate || true`
- **Database Config**: Uses `DATABASE_URL` or falls back to `RAILWAY_SERVICE_POSTGRES_URL`

## Troubleshooting

### If DATABASE_URL is missing:
1. Add PostgreSQL service (see step 1)
2. Railway will automatically set DATABASE_URL

### If connection fails:
1. Check PostgreSQL service is running (green status)
2. Verify services are linked via private networking
3. Check if using correct hostname (internal vs public)

### If migrations fail:
1. Check release phase logs
2. Verify DATABASE_URL is correct
3. Try manual migration via Shell (see step 5)

