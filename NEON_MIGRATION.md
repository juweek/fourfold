# Neon Postgres Migration

This document explains the changes made to migrate from Supabase to Neon Postgres.

## What Changed

### Dependencies
- **Removed**: `@supabase/ssr`, `@supabase/supabase-js`
- **Added**: `@neondatabase/serverless`, `ws`, `@types/ws`

### Database Connection
The app now connects directly to Postgres via `DATABASE_URL` instead of using Supabase client libraries.

### Code Changes
- `lib/db.ts`: Replaced Supabase client with a lightweight query builder wrapper around the Neon serverless driver
- The query builder maintains API compatibility with Supabase's query syntax, minimizing changes to existing code

### Environment Variables
- **Required**: `DATABASE_URL` (Neon Postgres pooled connection string)
- **Removed**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`

## Database Setup

Before deploying or running the app, you must set up the database schema.

### Local Development
```bash
# Set your DATABASE_URL environment variable
export DATABASE_URL="postgresql://..."

# Run the setup script
npm run db:setup
```

### Production (Neon)
Run the setup script once after creating your Neon database:
```bash
DATABASE_URL="your-neon-connection-string" npm run db:setup
```

Or manually execute the schema from `supabase/schema.sql` in your Neon SQL editor.

## What Replaces Supabase Features

### Database Access
- **Before**: Supabase JS client with query builder
- **After**: Neon serverless driver with compatible query builder wrapper

### Authentication & RLS
The app never used Supabase auth or Row Level Security (RLS). Authentication is handled via:
- `APP_PASSCODE` environment variable
- Simple passcode verification in `lib/auth.ts`
- Cookie-based session management

This authentication mechanism is unchanged.

### Timeouts & Retries
All existing timeout and retry behavior from `lib/fetch-utils.ts` and `lib/today.ts` is preserved.

## Vercel Deployment

1. Set the `DATABASE_URL` environment variable in Vercel project settings
2. Delete old Supabase variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`
3. Ensure other required variables are set: `RESEND_API_KEY`, `APP_PASSCODE`, `CRON_SECRET`, `APP_URL`
4. Deploy the branch
5. **Important**: Run `npm run db:setup` once (via Vercel CLI or a one-time deployment script) to initialize the schema

## Testing

The migration maintains backward compatibility with the existing API. All routes should work identically:
- `/api/today` - Get today's tasks and progress
- `/api/settings` - Get/update settings
- `/api/tasks` - CRUD operations on tasks
- All other existing endpoints

## Troubleshooting

### "DATABASE_URL environment variable is not set"
Ensure `DATABASE_URL` is configured in your environment variables.

### Connection errors
Verify your Neon connection string is correct and includes the pooler endpoint (e.g., `...-pooler...neon.tech`).

### Missing tables
Run `npm run db:setup` to create the schema.
