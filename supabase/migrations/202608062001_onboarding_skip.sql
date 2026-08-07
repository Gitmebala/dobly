-- The onboarding wizard had no way to skip or dismiss it - a user who
-- didn't want to finish every step right now had no escape hatch, and
-- the home page's "Finish setup" banner would keep pointing back at it
-- forever with no way to say "not now". Mirrors the existing
-- brain_tooltip_seen "seen this once" pattern already on this table.

alter table public.profiles
  add column if not exists onboarding_skipped_at timestamptz;
