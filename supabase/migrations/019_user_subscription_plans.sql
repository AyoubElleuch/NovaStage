-- NovaStage: Provisional User Subscription Plans
-- Adds a plan column to profiles with supported tiers: free, plus, pro, enterprise

alter table public.profiles
  add column if not exists plan text not null default 'free'
  constraint profiles_plan_check check (plan in ('free', 'plus', 'pro', 'enterprise'));

create index if not exists idx_profiles_plan on public.profiles(plan);
