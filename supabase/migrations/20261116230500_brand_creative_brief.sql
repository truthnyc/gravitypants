alter table public.directory_brands add column if not exists creative_brief jsonb not null default '{}'::jsonb, add column if not exists default_tags text[] not null default '{}';
