# Supabase Migration Guide

## Overview
This guide will help you convert your LMS application from Cosmic Database (Firestore) to Supabase (PostgreSQL).

## Prerequisites
1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project in your Supabase dashboard
3. Get your project URL and API keys

## Step 1: Environment Variables
Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Step 2: Database Schema
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the SQL schema from `supabase-schema.sql`
4. This will create all the necessary tables, indexes, and RLS policies

## Step 3: Authentication Setup
1. In Supabase dashboard, go to Authentication > Settings
2. Configure your authentication providers (Email, Google, etc.)
3. Set up any custom claims or user metadata as needed

## Step 4: Data Migration
If you have existing data in Cosmic Database, you'll need to migrate it:

1. Export data from Cosmic Database
2. Transform the data to match the PostgreSQL schema
3. Import the data into Supabase using the SQL editor or API

## Step 5: Update Application Code
The application code has been updated to use Supabase instead of Cosmic Database. Key changes:

- Replaced `cosmic-database` with `@supabase/supabase-js`
- Replaced `cosmic-authentication` with Supabase Auth
- Updated all database queries to use Supabase client
- Added proper TypeScript types

## Step 6: Test the Application
1. Start the development server: `npm run dev`
2. Test all major functionality:
   - User authentication
   - Course management
   - Quiz creation and taking
   - Assignment submission
   - Grade management

## Benefits of Supabase
- **Better Performance**: PostgreSQL is optimized for complex queries
- **Real-time**: Built-in real-time subscriptions
- **Security**: Row Level Security (RLS) for fine-grained access control
- **Type Safety**: Auto-generated TypeScript types
- **Open Source**: More control and transparency
- **SQL**: Familiar SQL syntax for complex queries

## Troubleshooting
- Check that all environment variables are set correctly
- Ensure the database schema is created properly
- Verify RLS policies are configured for your use case
- Check the Supabase logs for any errors

## Next Steps
1. Set up your Supabase project
2. Run the schema migration
3. Configure authentication
4. Test the application
5. Migrate any existing data
6. Deploy to production
