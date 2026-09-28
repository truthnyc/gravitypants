drop policy "brand-assets insert" on storage.objects;
create policy "brand-assets insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets'
    and lower(storage.extension(name)) in ('png','jpg','jpeg','webp','svg','gif')
    and (public.is_workspace_admin((storage.foldername(name))[1]) or public.has_support_session((storage.foldername(name))[1])));