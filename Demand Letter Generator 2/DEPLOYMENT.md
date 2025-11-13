# Local Deployment Guide

This guide will help you deploy the Demand Letter Generator locally on port 3003.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running (local or remote)
- AWS account with S3 bucket configured
- OpenRouter API key

## Quick Start

### Option 1: Using Setup Script

```bash
./scripts/setup-local.sh
```

Then update your `.env` file with your configuration and run:
```bash
npm run dev
```

### Option 2: Manual Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and update:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `JWT_SECRET` - A random secret for JWT tokens
   - `AWS_ACCESS_KEY_ID` - Your AWS access key
   - `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
   - `AWS_S3_BUCKET` - Your S3 bucket name
   - `OPENROUTER_API_KEY` - Your OpenRouter API key
   - `NEXTAUTH_URL` - Should be `http://localhost:3003`

3. **Setup Database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   Open [http://localhost:3003](http://localhost:3003) in your browser.

## Port Configuration

The application is configured to run on port 3003 by default (see `package.json`).

To change the port:
1. Update `package.json` dev script: `"dev": "next dev -p YOUR_PORT"`
2. Update `NEXTAUTH_URL` in `.env` to match the new port

## Database Schema

The database schema includes:
- User table with `logoUrl` field for company logos
- All other tables as defined in `prisma/schema.prisma`

Run `npm run db:push` to sync your database with the schema.

## Features Available

✅ Target/Recipient field in demand letters
✅ Date defaults to current day
✅ Generic template-based content generation
✅ Company logo upload and display
✅ PDF export with logo support
✅ Word export (logo placeholder)

## Troubleshooting

### Port Already in Use

If port 3003 is already in use:
```bash
# Find the process
lsof -i :3003

# Kill the process
kill -9 $(lsof -t -i:3003)
```

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database user permissions

### AWS S3 Issues

- Verify AWS credentials are correct
- Ensure S3 bucket exists and is accessible
- Check bucket permissions

### OpenRouter API Issues

- Verify your API key is correct
- Check your OpenRouter account has credits
- Ensure the model `anthropic/claude-3.5-sonnet` is available

## Next Steps

1. Log in with any email (password: 123456 for POC)
2. Create a new document
3. Fill in case information including target/recipient
4. Upload a company logo in the Overview panel
5. Generate sections
6. Export to PDF or Word

## Development Commands

```bash
# Start development server
npm run dev

# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations (production)
npm run db:migrate

# Build for production
npm run build

# Start production server
npm start
```

