# Manual Database Seeding Instructions

Since Railway's release phase logs can be hard to find, here's how to manually seed the database:

## Step-by-Step: Seed Database via Railway Shell

### Option 1: Via Railway Dashboard (Easiest)

1. **Open Railway Dashboard:**
   - Go to: https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb

2. **Click on "backend" service** (or go directly to):
   - https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb/service/1440f69c-6bea-45ee-a246-5fef6266f778

3. **Click on "Deployments" tab** (top navigation)

4. **Click on the latest deployment** (the one that shows "Active" or has a green checkmark)

5. **Look for a "Shell" or "Connect" button** (usually on the right side or in a dropdown)

6. **Click "Shell"** - This opens a terminal in your running container

7. **In the shell, run:**
   ```bash
   bundle exec rails db:seed RAILS_ENV=production
   ```

8. **You should see output like:**
   ```
   Created/Updated student1: student1@example.com
   Username: student 1
   Created/Updated admin: admin@example.com
   Username: admin
   Seed data created successfully!
   ```

### Option 2: Via Service Settings

1. **Go to your backend service**
2. **Click "Settings" tab**
3. **Look for "Shell" or "Terminal" section**
4. **Click to open shell**
5. **Run the seed command**

### Option 3: Check if Already Seeded

Before seeding, check if it's already done:

1. **Open Railway Shell** (same as above)
2. **Run:**
   ```bash
   bundle exec rails console RAILS_ENV=production
   ```
3. **In the Rails console, type:**
   ```ruby
   Student.count
   ```
   - If it returns `0` or `nil`, database needs seeding
   - If it returns a number > 0, database is already seeded

4. **Check for test users:**
   ```ruby
   Student.find_by(username: 'student 1')
   Student.find_by(username: 'admin')
   ```
   - If these return student objects, you're good!
   - If they return `nil`, you need to seed

5. **Exit console:**
   ```ruby
   exit
   ```

## Verify Seeding Worked

After seeding, test the login API:

```bash
curl -X POST https://backend-production-57f7.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student 1","password":"123456"}'
```

**Success response should include:**
```json
{
  "token": "...",
  "student": {
    "id": 1,
    "username": "student 1",
    ...
  }
}
```

**If you get an error**, check Railway logs for the error message.

## Test Users After Seeding

- **Student**: username `student 1`, password `123456`
- **Admin**: username `admin`, password `123456`

## Troubleshooting

**If Shell button is not visible:**
- Make sure you're looking at the latest deployment
- Try refreshing the page
- Check if the deployment is still building (wait for it to complete)

**If seed command fails:**
- Check error message in the shell
- Verify DATABASE_URL is set correctly
- Check if migrations ran successfully first

