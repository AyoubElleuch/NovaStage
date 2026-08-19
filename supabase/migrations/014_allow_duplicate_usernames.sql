-- Migration 014: Drop unique constraint on username to allow duplicate usernames
alter table public.profiles drop constraint if exists profiles_username_key;
drop index if exists public.profiles_username_key;
