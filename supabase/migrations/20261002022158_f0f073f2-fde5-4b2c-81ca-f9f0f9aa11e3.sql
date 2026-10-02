
-- 1. page_views: keep anonymous visit tracking, but validate the row contents
drop policy if exists "Anyone can record a visit" on public.page_views;
create policy "Anyone can record a visit"
on public.page_views
for insert
to anon, authenticated
with check (
  char_length(visitor_id) between 1 and 100
  and char_length(session_id) between 1 and 100
  and char_length(path) between 1 and 500
  and path like '/%'
  and (referrer is null or char_length(referrer) <= 1000)
  and (utm_source is null or char_length(utm_source) <= 200)
  and (utm_medium is null or char_length(utm_medium) <= 200)
  and (utm_campaign is null or char_length(utm_campaign) <= 200)
  and (device is null or char_length(device) <= 50)
);

-- 2. brand_requests: keep the public contact form, but validate the row contents
drop policy if exists "Anyone can send a request" on public.brand_requests;
create policy "Anyone can send a request"
on public.brand_requests
for insert
to anon, authenticated
with check (
  char_length(name) between 1 and 200
  and char_length(email) between 3 and 320
  and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and char_length(brand) between 1 and 200
  and (website is null or char_length(website) <= 500)
  and (message is null or char_length(message) <= 5000)
);

-- 3. storage: bind system template art reads to the signed-in caller
drop policy if exists "Signed-in users read system template art" on storage.objects;
create policy "Signed-in users read system template art"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'system'
  and auth.uid() is not null
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = auth.uid()
  )
);
