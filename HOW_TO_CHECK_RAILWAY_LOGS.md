# How to Check Railway Deployment Logs

## Finding Release Phase Logs in Railway Dashboard

### Method 1: Via Deployment Page

1. **Go to your Railway project:**
   - https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb

2. **Click on your backend service:**
   - Service name: "backend"
   - Or go directly: https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb/service/1440f69c-6bea-45ee-a246-5fef6266f778

3. **Click on "Deployments" tab** (at the top)

4. **Click on the latest deployment** (should show "Active" or "Success")

5. **Look for different phases:**
   - **Build** - Shows build logs
   - **Release** - Shows release phase logs (database migrations, seeding)
   - **Deploy** - Shows deployment logs

6. **Click on "Release" section** to see:
   - Database creation
   - Migration output
   - Seed output

### Method 2: Via Service Logs

1. **Go to your backend service**
2. **Click on "Logs" tab** (at the top)
3. **Look for messages like:**
   - "Running migrations..."
   - "Seeding database..."
   - "Created/Updated student1"
   - "Created/Updated admin"

### Method 3: Via Railway CLI

```bash
cd backend
railway logs --deployment latest
```

Or to see all logs:
```bash
railway logs --tail 100
```

## What to Look For

### Successful Database Seeding Should Show:
```
Created/Updated student1: student1@example.com
Username: student 1
Created/Updated admin: admin@example.com
Username: admin
Seed data created successfully!
```

### Successful Migrations Should Show:
```
== Running migrations...
== Migration completed
```

## If You Can't Find Release Logs

The release phase might have run but logs aren't visible. You can:

1. **Manually seed the database via Shell:**
   - Go to Deployments → Latest deployment
   - Click "Shell" or "Connect" button
   - Run: `bundle exec rails db:seed RAILS_ENV=production`

2. **Check if users exist:**
   - Use Railway Shell
   - Run: `bundle exec rails console RAILS_ENV=production`
   - Then: `Student.count` (should be > 0)
   - Then: `Student.find_by(username: 'student 1')` (should return a student)

## Alternative: Test via API

If the database is seeded, the login API should work:
```bash
curl -X POST https://backend-production-57f7.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student 1","password":"123456"}'
```

If it returns a token, the database is seeded correctly.

