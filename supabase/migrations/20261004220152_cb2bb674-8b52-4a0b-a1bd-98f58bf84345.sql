create extension if not exists pg_trgm with schema extensions;

create table public.directory_brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  website_url text,
  category text not null default 'Other' check (category in ('Fashion','Beauty','Food & Drink','Home','Travel & Photography','Nonprofits','Other')),
  description text check (char_length(description) <= 120),
  logo_url text,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$' and slug not in ('directory','admin','search','new','edit','api','app')),
  first_approved_at timestamptz,
  plan_ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.directory_brands to anon;
grant select, insert, update on public.directory_brands to authenticated;
grant all on public.directory_brands to service_role;
alter table public.directory_brands enable row level security;

create table public.directory_slug_history (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.directory_brands(id) on delete cascade,
  old_slug text not null,
  changed_at timestamptz not null default now()
);
create index on public.directory_slug_history (old_slug);
grant select on public.directory_slug_history to anon;
grant select, insert on public.directory_slug_history to authenticated;
grant all on public.directory_slug_history to service_role;
alter table public.directory_slug_history enable row level security;

create table public.directory_reels (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null unique references public.projects(id) on delete cascade,
  brand_id uuid not null references public.directory_brands(id) on delete cascade,
  status text not null default 'private' check (status in ('private','in_review','live','hidden')),
  tags text[] not null default '{}',
  moods text[] not null default '{}' check (cardinality(moods) <= 3),
  template_id uuid references public.templates(id) on delete set null,
  formats text[] not null default '{}',
  poster_url text,
  preview_url text,
  search_text tsvector,
  published_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.directory_reels to anon;
grant select, insert, update on public.directory_reels to authenticated;
grant all on public.directory_reels to service_role;
alter table public.directory_reels enable row level security;

create table public.permission_log (
  id uuid primary key default gen_random_uuid(),
  directory_reel_id uuid references public.directory_reels(id) on delete set null,
  ad_id uuid,
  brand_id uuid not null references public.directory_brands(id),
  user_id uuid not null default auth.uid(),
  action text not null check (action in ('granted','withdrawn')),
  full_name text not null,
  job_title text,
  email text not null default '',
  wording_version text not null,
  wording_text text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on public.permission_log (brand_id, created_at desc);
grant select, insert on public.permission_log to authenticated;
grant select, insert on public.permission_log to service_role;
alter table public.permission_log enable row level security;

-- Helpers
create or replace function public.directory_paid_plans() returns text[] language sql immutable
  as $$ select array['simple','simple_yearly','business','business_yearly','team','team_yearly'] $$;
create or replace function public.featured_plans() returns text[] language sql immutable
  as $$ select array['business','business_yearly'] $$;

create or replace function public.directory_effective_plan(_ws uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.workspaces w where w.id = _ws and w.owner_id is not null and public.has_role(w.owner_id, 'admin')) then 'business'
    when b.comp_plan is not null and b.comp_until > now() then b.comp_plan
    when b.plan = any(public.directory_paid_plans()) and (b.status <> 'canceled' or b.current_period_end > now()) then b.plan
    else null end
  from (select 1) x left join public.workspace_billing b on b.workspace_id = public.billing_source(_ws)
$$;

create or replace function public.is_featured_brand(_brand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.directory_effective_plan(workspace_id) = any(public.featured_plans()), false)
  from public.directory_brands where id = _brand
$$;

create or replace function public.brand_visible(_brand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.directory_effective_plan(workspace_id) is not null
    or (plan_ended_at is not null and plan_ended_at > now() - interval '30 days'), false)
  from public.directory_brands where id = _brand
$$;

create or replace function public.is_brand_member(_brand uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.directory_brands b where b.id = _brand
    and (public.is_workspace_member(b.workspace_id::text) or public.has_support_session(b.workspace_id::text)))
$$;

create or replace function public.slug_status(_slug text, _brand uuid default null) returns text
language sql stable security definer set search_path = public as $$
  select case
    when _slug !~ '^[a-z0-9-]{3,40}$' then 'invalid'
    when _slug in ('directory','admin','search','new','edit','api','app') then 'reserved'
    when exists (select 1 from public.directory_brands where slug = _slug and id = _brand) then 'yours'
    when exists (select 1 from public.directory_brands where slug = _slug) then 'taken'
    when exists (select 1 from public.directory_slug_history where old_slug = _slug and changed_at > now() - interval '12 months'
      and brand_id is distinct from _brand) then 'taken'
    else 'available' end
$$;

create or replace function public.tags_text(text[]) returns text language sql immutable
  as $$ select array_to_string($1, ' ') $$;

-- search_text
create or replace function public.directory_reel_search() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.directory_brands; tn text;
begin
  select * into b from public.directory_brands where id = new.brand_id;
  select name into tn from public.templates where id = new.template_id;
  new.search_text :=
    setweight(to_tsvector('simple', coalesce(b.name,'')), 'A') ||
    setweight(to_tsvector('simple', public.tags_text(new.tags)), 'A') ||
    setweight(to_tsvector('simple', public.tags_text(new.moods)), 'B') ||
    setweight(to_tsvector('simple', coalesce(tn,'') || ' ' || coalesce(b.category,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(b.description,'')), 'C');
  new.updated_at := now();
  return new;
end $$;
create trigger directory_reels_search before insert or update on public.directory_reels
  for each row execute function public.directory_reel_search();
create trigger directory_brands_updated_at before update on public.directory_brands
  for each row execute function public.set_updated_at();

-- permission_log: server-set fields, append-only
create or replace function public.permission_log_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.email := coalesce(auth.jwt() ->> 'email', '');
  end if;
  new.created_at := now();
  return new;
end $$;
create trigger permission_log_defaults before insert on public.permission_log
  for each row execute function public.permission_log_defaults();
create or replace function public.permission_log_readonly() returns trigger language plpgsql as $$
begin raise exception 'The permission log cannot be changed'; end $$;
create trigger permission_log_readonly before update or delete on public.permission_log
  for each row execute function public.permission_log_readonly();

-- Policies
create policy "Public reads visible brands" on public.directory_brands for select to anon, authenticated
  using (public.brand_visible(id) and exists (select 1 from public.directory_reels r where r.brand_id = directory_brands.id and r.status = 'live'));
create policy "Members read own brand" on public.directory_brands for select to authenticated
  using (public.is_workspace_member(workspace_id::text) or public.has_support_session(workspace_id::text) or public.is_platform_admin());
create policy "Members create own brand" on public.directory_brands for insert to authenticated
  with check (public.is_workspace_member(workspace_id::text) and first_approved_at is null);
create policy "Members update own brand" on public.directory_brands for update to authenticated
  using (public.is_workspace_member(workspace_id::text) or public.is_platform_admin())
  with check (public.is_workspace_member(workspace_id::text) or public.is_platform_admin());

create policy "Public reads recent slugs" on public.directory_slug_history for select to anon, authenticated
  using (changed_at > now() - interval '12 months');
create policy "Members add slug history" on public.directory_slug_history for insert to authenticated
  with check (public.is_brand_member(brand_id));

create policy "Public reads live reels" on public.directory_reels for select to anon, authenticated
  using (status = 'live' and public.brand_visible(brand_id));
create policy "Members read own reels" on public.directory_reels for select to authenticated
  using (public.is_brand_member(brand_id) or public.is_platform_admin());
create policy "Members add own reels" on public.directory_reels for insert to authenticated
  with check (public.is_brand_member(brand_id));
create policy "Members update own reels" on public.directory_reels for update to authenticated
  using (public.is_brand_member(brand_id) or public.is_platform_admin())
  with check (public.is_brand_member(brand_id) or public.is_platform_admin());

create policy "Members log permission" on public.permission_log for insert to authenticated
  with check (public.is_brand_member(brand_id) and user_id = auth.uid());
create policy "Members and admins read log" on public.permission_log for select to authenticated
  using (public.is_brand_member(brand_id) or public.is_platform_admin());

-- Members may not self-approve: only admins can set first_approved_at
create or replace function public.guard_brand_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.first_approved_at is distinct from old.first_approved_at and not public.is_platform_admin() and auth.uid() is not null then
    new.first_approved_at := old.first_approved_at;
  end if;
  return new;
end $$;
create trigger guard_brand_approval before update on public.directory_brands
  for each row execute function public.guard_brand_approval();

-- Members may not go live before the brand is approved
create or replace function public.guard_reel_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'live' and (tg_op = 'INSERT' or old.status <> 'live') and auth.uid() is not null and not public.is_platform_admin()
     and not exists (select 1 from public.directory_brands where id = new.brand_id and first_approved_at is not null) then
    new.status := 'in_review';
  end if;
  if new.status = 'live' and (tg_op = 'INSERT' or old.status <> 'live') then new.published_at := now(); new.hidden_at := null; end if;
  if new.status = 'hidden' and (tg_op = 'INSERT' or old.status <> 'hidden') then new.hidden_at := now(); end if;
  return new;
end $$;
create trigger guard_reel_status before insert or update on public.directory_reels
  for each row execute function public.guard_reel_status();

-- Indexes
create index directory_reels_search_idx on public.directory_reels using gin (search_text);
create index directory_reels_tags_trgm on public.directory_reels using gin (public.tags_text(tags) extensions.gin_trgm_ops);
create index directory_brands_name_trgm on public.directory_brands using gin (name extensions.gin_trgm_ops);

-- Search
create or replace function public.search_directory(q text default '', size text default null)
returns table(reel_id uuid, ad_id uuid, brand_id uuid, brand_name text, brand_slug text, category text,
  tags text[], moods text[], formats text[], poster_url text, preview_url text, template_name text,
  featured boolean, score real)
language plpgsql stable security definer set search_path = public, extensions as $$
declare words text := lower(coalesce(q, '')); fmt text := size; ts tsquery;
begin
  if fmt is null then
    if words ~ '(9:16|vertical|tiktok|reels?|stories|shorts)' then fmt := '9x16';
    elsif words ~ '(1:1|square)' then fmt := '1x1';
    elsif words ~ '(16:9|wide|youtube|landscape)' then fmt := '16x9'; end if;
  end if;
  words := btrim(regexp_replace(words, '(9:16|1:1|16:9|vertical|tiktok|reels?|stories|shorts|square|wide|youtube|landscape)', ' ', 'g'));
  words := btrim(regexp_replace(words, '\s+', ' ', 'g'));
  if words <> '' then
    ts := to_tsquery('simple', (select string_agg(quote_literal(w) || ':*', ' | ') from unnest(string_to_array(words, ' ')) w where w <> ''));
  end if;
  return query
  select r.id, r.ad_id, b.id, b.name, b.slug, b.category, r.tags, r.moods, r.formats, r.poster_url, r.preview_url,
    t.name, public.is_featured_brand(b.id),
    (case when words = '' then 0 else
      coalesce(ts_rank(r.search_text, ts), 0) + greatest(similarity(b.name, words), similarity(public.tags_text(r.tags), words)) end)::real
  from public.directory_reels r
  join public.directory_brands b on b.id = r.brand_id
  left join public.templates t on t.id = r.template_id
  where r.status = 'live' and public.brand_visible(b.id)
    and (fmt is null or fmt = any(r.formats))
    and (words = '' or r.search_text @@ ts or similarity(b.name, words) > 0.25 or similarity(public.tags_text(r.tags), words) > 0.2)
  order by 14 desc, r.published_at desc nulls last
  limit 120;
end $$;
grant execute on function public.search_directory(text, text) to anon, authenticated;
grant execute on function public.slug_status(text, uuid) to anon, authenticated;
grant execute on function public.is_featured_brand(uuid) to anon, authenticated;