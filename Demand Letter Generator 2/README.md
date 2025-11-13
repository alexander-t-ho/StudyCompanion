# Demand Letter Generator POC

AI-powered demand letter generation tool built with Next.js 14+, Prisma, and PostgreSQL.

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Vercel Postgres, Supabase, or local)
- AWS account (for S3 storage)
- OpenRouter API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up the database:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

4. Run the development server:
```bash
npm run dev
```

The server will start on port 3003. Open [http://localhost:3003](http://localhost:3003) in your browser.

### Quick Setup Script

For a faster setup, you can use the setup script:
```bash
./scripts/setup-local.sh
```

Or use the automated setup command:
```bash
npm run setup
```

### Verify Setup

Check your setup configuration:
```bash
npm run check-setup
```

This will verify:
- ✅ Environment file exists
- ✅ Required environment variables are set
- ✅ Database connection works
- ✅ Port 3003 is available

### Health Check

Quick health check of running services:
```bash
./scripts/health-check.sh
```

Or manually:
```bash
# Check if server is running
curl http://localhost:3003

# Test database connection
npm run db:test
```

This will:
- Create `.env` from `env.example` if it doesn't exist
- Install dependencies
- Generate Prisma client
- Push database schema
- Check port availability

## Project Structure

```
/
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                    # Utility libraries
│   ├── db/                # Database client and queries
│   ├── ai/                # AI integration
│   ├── aws/               # AWS S3 integration
│   └── ...
├── prisma/                # Prisma schema and migrations
└── public/                # Static assets
```

## Database Schema

The database includes the following models:
- `User` - User accounts (includes `logoUrl` for company logo)
- `Template` - Demand letter templates
- `Document` - Demand letter documents
- `DocumentSection` - Sections within documents
- `SourceDocument` - Uploaded source files
- `MedicalProvider` - Medical provider data
- `GenerationHistory` - AI generation history
- `Transcription` - Media transcriptions

See `prisma/schema.prisma` for full schema definition.

## Features

### Recent Updates

- **Target/Recipient Field**: Specify the recipient of demand letters in the case information
- **Date Defaults**: Date of letter automatically defaults to current day
- **Generic Template-Based Generation**: AI generates generic, professional content based on template structure
- **Company Logo Support**: Upload and display company logos at the top of exported documents
  - Logo upload available in Overview Panel
  - Logos appear in PDF exports
  - Logo placeholder in Word exports (full image support coming soon)

## Environment Variables

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET` - S3 bucket name (with alexho- prefix)
- `OPENROUTER_API_KEY` - OpenRouter API key

## Development

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create and run migration (production)
npm run db:migrate
```

### Testing

```bash
npm run test
```

## Deployment

This project is configured for deployment on Vercel.

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

## PRD Documentation

See the `PRD-*.md` files for detailed requirements for each module.

## License

Private - Steno Project

