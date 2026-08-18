-- NovaStage: Fix recursive profiles RLS policies.

-- The old admin policy queried public.profiles from inside a public.profiles
-- policy, which caused PostgreSQL error 42P17 on every profile request.
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Admins can view all profiles." on public.profiles;

create policy "Users can view their own profile or permitted profiles."
	on public.profiles for select
	to authenticated
	using (
		auth.uid() = id
		or public.has_permission(auth.uid(), 'users:read')
	);

drop policy if exists "Users can update their own profile." on public.profiles;

create policy "Users can update their own profile."
	on public.profiles for update
	to authenticated
	using (auth.uid() = id)
	with check (auth.uid() = id);