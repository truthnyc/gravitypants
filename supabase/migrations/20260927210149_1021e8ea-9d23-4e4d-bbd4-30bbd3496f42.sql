create or replace function public.admin_storage_by_workspace()
returns table (workspace_id text, bytes bigint) language sql stable security definer set search_path = public, storage as $$
  select (storage.foldername(name))[1], coalesce(sum((metadata->>'size')::bigint), 0)
  from storage.objects where bucket_id = 'media' group by 1
$$;
revoke execute on function public.admin_storage_by_workspace() from public, anon, authenticated;
grant execute on function public.admin_storage_by_workspace() to service_role;

create policy "Support manage exports" on public.exports for all to authenticated
  using (public.has_support_session(workspace_id::text)) with check (public.has_support_session(workspace_id::text));