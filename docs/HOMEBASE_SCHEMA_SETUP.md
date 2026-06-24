# Homebase Schema Setup

If Homebase actions fail with:

`Could not find the table 'public.office_events' in the schema cache`

the database has not been upgraded with the Homebase office kernel yet.

## Apply The Schema

1. Open your Supabase project.
2. Go to SQL Editor.
3. Paste and run `supabase/dobly_operating_system_schema.sql`.
4. If Supabase still reports schema-cache errors, refresh/restart the API schema cache from Supabase settings or wait briefly and retry.

## Required Tables

- `office_workers`
- `office_events`
- `office_tasks`
- `content_items`
- `social_accounts`
- `integration_health_events`

## Check Status

After applying the SQL, call:

`GET /api/office/schema-status`

It should return:

```json
{ "ready": true, "missing": [] }
```

## Always-On Worker

Set `WORKER_SECRET`, then run a daemon:

```bash
DOBLY_APP_URL=https://your-app.com WORKER_SECRET=... npm run office:worker
```

Or configure cron to call:

`POST /api/internal/office-worker`

with header:

`x-dobly-worker: WORKER_SECRET`
