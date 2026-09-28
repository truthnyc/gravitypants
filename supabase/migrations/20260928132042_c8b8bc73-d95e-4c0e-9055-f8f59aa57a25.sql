update public.workspace_invites
set accepted_at = null
where id = 'fcf15ad1-8cbb-407c-a795-57aa0b7f27ab'::uuid
  and workspace_id = '63903993-0376-44ad-813b-d879f39b160e'::uuid
  and lower(email) = 'test3@gravitypants.com'
  and exists (
    select 1
    from public.workspace_members
    where workspace_id = '63903993-0376-44ad-813b-d879f39b160e'::uuid
      and user_id = '82d2a754-fec3-4bf1-bd86-a9aea9fea6ba'::uuid
      and role = 'editor'
  );