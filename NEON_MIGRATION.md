# Neon Postgres Migration

This document provides setup instructions for migrating from Supabase to Neon Postgres.

## Environment Variables

### Required
- `DATABASE_URL` - Neon Postgres pooled connection string

### Remove from Vercel
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD`

### Keep Unchanged
- `RESEND_API_KEY`
- `APP_PASSCODE`
- `CRON_SECRET`
- `APP_URL`

## Database Setup

Before deploying, initialize the database schema.

### Method 1: Setup Script (Recommended)

```bash
# Set your DATABASE_URL
export DATABASE_URL="postgresql://..."

# Install dependencies and run setup
npm install
npm run db:setup
```

### Method 2: Manual SQL

Execute the schema from `db/schema.sql` in your Neon SQL editor.

The schema is idempotent and safe to run multiple times.

## Deployment Steps

1. Set `DATABASE_URL` in Vercel project settings
2. Delete old Supabase variables (listed above)
3. Run database setup (either method)
4. Deploy the branch
5. Test all API routes

## Troubleshooting

**"DATABASE_URL environment variable is not set"**  
Configure DATABASE_URL in your environment.

**Connection errors**  
Verify your connection string includes the pooler endpoint (contains `-pooler...neon.tech`).

**Missing tables**  
Run `npm run db:setup` to create the schema.
