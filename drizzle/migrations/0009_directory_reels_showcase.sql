alter table public.directory_reels
  add column in_showcase boolean not null default false,
  add column showcase_order integer,
  add column showcase_at timestamptz,
  add column showcase_by uuid references auth.users(id) on delete set null;

create index directory_reels_showcase_idx on public.directory_reels (showcase_order) where in_showcase;

create or replace function public.directory_reels_showcase_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status <> 'live' then
    new.in_showcase := false;
    new.showcase_order := null;
    new.showcase_at := null;
    new.showcase_by := null;
  elsif new.in_showcase is true
    and (TG_OP = 'INSERT' or old.in_showcase is not true)
    and not public.is_platform_admin()
    and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only staff can feature a reel';
  end if;
  return new;
end;
$$;

create trigger directory_reels_showcase_guard
  before insert or update on public.directory_reels
  for each row execute function public.directory_reels_showcase_guard();