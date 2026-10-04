# Ad flow redesign + Directory

Builds briefs 1–6 in order. Each stage keeps every existing editor and export feature working.

## Stages
1. **Shared step layout:** top bar with the 4-step control, a sticky left reel card (preview, play, name, Saved state, Sizes), and a right card with the step's actions. Pages: Photos, Edit, Export, Share. Purple selection changes to blue everywhere in these steps.
2. **Photos (new page):** drop zone, numbered thumbnails you can drag to reorder or remove, the template row, and "Next: Edit".
3. **Edit:** a frame strip, Duplicate/Delete, the brand kit row, the six element tiles, and settings using the new fields. Undo, autosave, rename, "Make global template" and the admin read-only view stay as they are.
4. **Export:** preset cards, Save as, Video motion and GIF quality, a summary box and progress. After the files are ready: file rows, "Download all", and the "Share it to the Directory" box linking to Share.
5. **Database (SQL below):** the user asked to approve this before it runs.
6. **Share:**
   - Plan notices and brand details: keywords, up to 3 moods, and suggestions taken from your photos.
   - The Directory toggle and the permission box with wording v1.0, plus the search preview.
   - Done, Submit for review, or Publish. Permission is saved on the server in one step.
7. **Your Ads:** a Directory status on each ad, with "Share to the Directory" and "Hide from the Directory" (hiding logs "withdrawn").
8. **Account → Directory tab:**
   - Brand page address with a live check, plus slug history and redirects.
   - "View page" link and a reels table.
   - Permission log with CSV download.
9. **Public pages:** `/directory` (search) and `/directory/$slug` (brand page). Old addresses redirect for 12 months.

## Decisions to confirm
- **No clients table exists.** "Clients" are workspaces given a free plan. I'll leave out `client_id`, since the workspace already identifies the brand.
- **One brand per workspace** for now.
- **Posters:** the still is drawn by `renderAt()` at 0.6 s into frame 1, after the fade-in. It's saved to a new **public** `directory` storage space, because signed-out visitors must see it. Workspace files stay private. Only copies of shared reels go there.
- **Featured** = Business or Business Yearly (including free Business plans), based on the existing billing rules. The plan list lives in one SQL function so Team can be added later.
- **Grace period:** reels stay visible 30 days after a plan ends. Then they're hidden in search, not deleted.
- **Review:** the first reel goes to `in_review`. Admins approve it in a new Admin → Directory list, which sets `first_approved_at`.

## Technical details: proposed SQL (adds only, nothing renamed or dropped)

```sql
create extension if not exists pg_trgm with schema extensions;

create table public.directory_brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  website_url text,
  category text not null default 'Other' check (category in
    ('Fashion','Beauty','Food & Drink','Home','Travel & Photography','Nonprofits','Other')),
  description text check (char_length(description) <= 120),
  logo_url text,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'
    and slug not in ('directory','admin','search','new','edit','api','app')),
  first_approved_at timestamptz,
  plan_ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.directory_slug_history (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.directory_brands(id) on delete cascade,
  old_slug text not null,
  changed_at timestamptz not null default now()
);

create table public.directory_reels (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null unique references public.projects(id) on delete cascade,
  brand_id uuid not null references public.directory_brands(id) on delete cascade,
  status text not null default 'private' check (status in ('private','in_review','live','hidden')),
  tags text[] not null default '{}',
  moods text[] not null default '{}' check (cardinality(moods) <= 3),
  template_id uuid references public.templates(id) on delete set null,
  formats text[] not null default '{}',
  poster_url text, preview_url text,
  search_text tsvector,           -- filled by trigger from brand, tags, moods, template, category, description
  published_at timestamptz, hidden_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.permission_log (
  id uuid primary key default gen_random_uuid(),
  directory_reel_id uuid references public.directory_reels(id) on delete set null,
  ad_id uuid, brand_id uuid not null references public.directory_brands(id),
  user_id uuid not null default auth.uid(),
  action text not null check (action in ('granted','withdrawn')),
  full_name text not null, job_title text,
  email text not null,            -- trigger overwrites with auth.jwt() email
  wording_version text not null, wording_text text not null,
  ip_address text, user_agent text,
  created_at timestamptz not null default now()  -- trigger forces now()
);

-- grants: anon select on brands/reels; authenticated select/insert/update on brands/reels;
-- authenticated select/insert only on permission_log; service_role all. RLS enabled on all four.
-- Policies:
--  brands/reels: anon+auth read when a reel is live and the brand is visible (plan active or within 30-day grace);
--    workspace members read/write their own; is_platform_admin() reads/updates all.
--  slug_history: members of the brand's workspace read/insert; public read for redirects (< 12 months).
--  permission_log: insert when the user is a member of the brand's workspace and user_id = auth.uid();
--    select for those members and admins; no update/delete policy, plus a trigger that raises on update/delete.

create function public.featured_plans() returns text[] language sql immutable
  as $$ select array['business','business_yearly'] $$;
create function public.is_featured_brand(_brand uuid) returns boolean ...  -- effective plan via billing_source()
create function public.brand_visible(_brand uuid) returns boolean ...      -- paid, or plan ended < 30 days ago
create function public.search_directory(q text, size text default null)
  returns table(reel_id uuid, brand jsonb, ... , featured boolean, score real) ...
  -- strips size words (square, vertical, tiktok, youtube, wide, 9:16, 1:1, 16:9) into a format filter,
  -- ranks by ts_rank + similarity(brand name / tags), live + visible only.

create index on public.directory_reels using gin (search_text);
create index on public.directory_reels using gin (array_to_string_immutable(tags) gin_trgm_ops);
create index on public.directory_brands using gin (name gin_trgm_ops);
```

Server functions: `checkSlug`, `saveSlug`, `shareReel` (upsert + permission row with IP and user agent from the request), `hideReel`, `getPermissionLog`, and public `searchDirectory` / `getBrandPage`.
