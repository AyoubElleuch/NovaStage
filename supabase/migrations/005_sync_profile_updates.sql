-- NovaStage: Keep profile timestamps and confirmed Auth email changes in sync.

-- 1. Maintain updated_at for direct profile writes.
create or replace function public.set_profile_updated_at()
returns trigger
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

-- 2. The Auth email is only final after the user confirms the new address.
-- Keep the public profile email aligned with that confirmed Auth value.
create or replace function public.sync_profile_email_from_auth()
returns trigger
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email,
        updated_at = timezone('utc'::text, now())
    where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_profile_email_from_auth on auth.users;

create trigger sync_profile_email_from_auth
  after update of email on auth.users
  for each row execute function public.sync_profile_email_from_auth();