create table public.storage_alerts (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  alerted_at timestamptz not null default now(),
  used_bytes bigint not null,
  limit_bytes bigint not null
);
grant all on public.storage_alerts to service_role;
alter table public.storage_alerts enable row level security;