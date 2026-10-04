alter table public.directory_reels add column if not exists review_note text, add column if not exists hidden_reason text;
alter table public.directory_brands add column if not exists grace_emails_sent int not null default 0;

create table public.directory_reports (
  id uuid primary key default gen_random_uuid(),
  directory_reel_id uuid not null references public.directory_reels(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  reporter_email text check (reporter_email is null or char_length(reporter_email) <= 200),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
grant insert on public.directory_reports to anon, authenticated;
grant select, update on public.directory_reports to authenticated;
grant all on public.directory_reports to service_role;
alter table public.directory_reports enable row level security;
create policy "Anyone can report a live reel" on public.directory_reports for insert to anon, authenticated
  with check (resolved_at is null and exists (select 1 from public.directory_reels r where r.id = directory_reel_id and r.status = 'live'));
create policy "Admins read reports" on public.directory_reports for select to authenticated using (public.is_platform_admin());
create policy "Admins resolve reports" on public.directory_reports for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create table public.directory_make_events (
  id uuid primary key default gen_random_uuid(),
  directory_reel_id uuid references public.directory_reels(id) on delete set null,
  template_id uuid,
  user_id uuid not null,
  project_id uuid,
  created_at timestamptz not null default now()
);
grant insert on public.directory_make_events to authenticated;
grant select on public.directory_make_events to authenticated;
grant all on public.directory_make_events to service_role;
alter table public.directory_make_events enable row level security;
create policy "Users log their own starts" on public.directory_make_events for insert to authenticated with check (user_id = auth.uid());
create policy "Admins read starts" on public.directory_make_events for select to authenticated using (public.is_platform_admin());