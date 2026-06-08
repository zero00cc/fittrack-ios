-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Add macro target columns to calorie_settings
alter table calorie_settings
  add column if not exists protein_target int not null default 150,
  add column if not exists carbs_target   int not null default 200,
  add column if not exists fat_target     int not null default 65;

-- 2. Create weight_log table (one JSON blob row per user, same pattern as calorie_history)
create table if not exists weight_log (
  user_id    uuid         references auth.users(id) on delete cascade primary key,
  data       jsonb        not null default '{}',
  updated_at timestamptz  not null default now()
);
alter table weight_log enable row level security;
create policy "Users manage own weight log" on weight_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
