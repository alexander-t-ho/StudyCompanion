# Quick Start Guide

Get the Demand Letter Generator running on port 3003 in minutes.

## 🚀 Quick Start

### 1. Check Your Setup

```bash
npm run check-setup
```

This will verify:
- ✅ Environment file exists
- ✅ Required environment variables are configured
- ✅ Database connection works
- ✅ Port 3003 is available

### 2. Initialize Environment (if needed)

If `.env` doesn't exist:

```bash
./scripts/init-env.sh
# Then edit .env with your actual values
```

Or manually:
```bash
cp env.example .env
# Edit .env with your credentials
```

### 3. Setup Database

```bash
npm run db:push
```

### 4. Start the Server

```bash
npm run dev
```

The server will start on **http://localhost:3003**

## 📋 Required Environment Variables

Make sure your `.env` file has these configured:

### Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - A secure random string for JWT tokens
- `NEXTAUTH_URL` - `http://localhost:3003`
- `OPENROUTER_API_KEY` - Your OpenRouter API key

### Optional (for file uploads):
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (e.g., `us-east-1`)
- `AWS_S3_BUCKET` - S3 bucket name

## 🔧 Useful Commands

### Setup & Verification
```bash
# Check setup status
npm run check-setup

# Initialize .env file
./scripts/init-env.sh

# Full setup (check + database)
npm run setup
```

### Database
```bash
# Test database connection
npm run db:test

# Push schema changes
npm run db:push

# Generate Prisma client
npm run db:generate
```

### Server Management
```bash
# Start development server
npm run dev

# Check if server is running
curl http://localhost:3003

# Find process on port 3003
lsof -i :3003

# Stop server (kill process)
kill -9 $(lsof -t -i:3003)
```

### Health Check
```bash
# Quick health check
./scripts/health-check.sh
```

## 🐛 Troubleshooting

### Port 3003 Already in Use

```bash
# Find the process
lsof -i :3003

# Kill it
kill -9 $(lsof -t -i:3003)
```

### Database Connection Failed

1. Verify PostgreSQL is running:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Check your `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/demand_letter_generator?schema=public"
   ```

3. Test connection:
   ```bash
   npm run db:test
   ```

### Server Won't Start

1. Check for errors in terminal
2. Verify all required environment variables are set:
   ```bash
   npm run check-setup
   ```
3. Ensure dependencies are installed:
   ```bash
   npm install
   ```

### Environment Variables Not Loading

- Make sure `.env` file exists in project root
- Check for typos in variable names
- Restart the server after changing `.env`

## 📝 Next Steps

1. **Login**: Visit http://localhost:3003/login
   - For POC, use any email with password: `123456`

2. **Create Document**: Use the dashboard to create a new demand letter

3. **Analyze Document**: Upload a document in the "Analyze Document" section

4. **Generate**: Create demand letters with AI assistance

## 🔗 Useful Links

- Main README: [README.md](./README.md)
- Deployment Guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- API Documentation: Check `app/api/` directory

