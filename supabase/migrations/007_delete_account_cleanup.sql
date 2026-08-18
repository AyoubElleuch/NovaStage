-- NovaStage: Remove waitlist records when a user deletes their account.

create or replace function public.cleanup_deleted_user_data()
returns trigger
security definer
set search_path = public
as $$
begin
  delete from public.waitlist where auth_user_id = old.id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists cleanup_deleted_user_data on auth.users;

create trigger cleanup_deleted_user_data
  before delete on auth.users
  for each row execute function public.cleanup_deleted_user_data();