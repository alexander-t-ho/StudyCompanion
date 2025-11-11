# Seed Production Database

## Via Railway Dashboard (Recommended)

1. **Open Railway Dashboard:**
   - Go to: https://railway.com/project/36e049d9-b28d-4e6e-a11f-fe6cfc5780cb/service/1440f69c-6bea-45ee-a246-5fef6266f778

2. **Open Service Shell:**
   - Click on the **"Deployments"** tab
   - Click on the **latest deployment** (should show "Active" or "Success")
   - Click **"View Logs"** or look for **"Shell"** / **"Terminal"** button
   - Or go to the service page and click **"Shell"** tab

3. **Run Seed Command:**
   ```bash
   bundle exec rails db:seed RAILS_ENV=production
   ```

4. **Verify:**
   You should see output like:
   ```
   Creating student 1...
   Creating admin user...
   Seeding complete!
   ```

## Alternative: Via Railway CLI (once service is ready)

Once the deployment is complete and the service is running:

```bash
cd backend
railway ssh --service backend
# Then in the SSH session:
bundle exec rails db:seed RAILS_ENV=production
exit
```

## What Gets Seeded

- Student user: username `student 1`, password `123456`
- Admin user: username `admin`, password `123456`
- Initial data for testing

## After Seeding

Test your deployment:
- Frontend: https://frontend-81vodo06r-alexander-hos-projects.vercel.app
- Login with: username `student 1`, password `123456`

