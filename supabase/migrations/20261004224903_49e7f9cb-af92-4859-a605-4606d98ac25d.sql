create policy "Admins add slug history" on public.directory_slug_history for insert to authenticated
  with check (public.is_platform_admin());