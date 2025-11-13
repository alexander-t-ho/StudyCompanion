# Seed Production Database

## Important: Database Must Be Seeded

The login will fail if the database hasn't been seeded with test users. 

## How to Seed the Database

### Option 1: Via Railway Dashboard (Recommended)

1. Go to Railway Dashboard: https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb/service/1440f69c-6bea-45ee-a246-5fef6266f778

2. Click on "Deployments" tab

3. Click on the latest deployment

4. Click "Shell" or "Connect" button

5. Run the seed command:
   ```bash
   bundle exec rails db:seed RAILS_ENV=production
   ```

### Option 2: Check if Release Phase Seeded

The release phase should have run migrations, but may not have seeded. Check the deployment logs to see if seeds ran.

### Test Users After Seeding

- **Student**: username `student 1`, password `123456`
- **Admin**: username `admin`, password `123456`

## Verify Database is Seeded

After seeding, test the login:
1. Go to frontend: https://frontend-gp4zoifzz-alexander-hos-projects.vercel.app
2. Try logging in with: `student 1` / `123456`
3. If login fails, check Railway logs for errors

