# Supabase Configuration for ZARU ENTERPRISE

This folder contains the official database migrations, configuration, and setup guides for connecting ZARU ENTERPRISE with Supabase.

## Files
- `config.toml`: Supabase local development & project configuration.
- `migrations/20260927000000_zaru_initial_schema.sql`: Full SQL script creating tables, RLS security rules, triggers, realtime replication, and payment storage bucket.

## How to Deploy to your Supabase Project
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Paste the contents of `migrations/20260927000000_zaru_initial_schema.sql` and click **Run**.
4. In your `.env`, set:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
