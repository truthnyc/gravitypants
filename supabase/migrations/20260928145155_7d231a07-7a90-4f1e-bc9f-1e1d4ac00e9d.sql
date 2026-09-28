revoke all on function public.in_other_team(uuid, uuid) from public;
revoke all on function public.in_other_team(uuid, uuid) from anon;
revoke all on function public.in_other_team(uuid, uuid) from authenticated;
grant execute on function public.in_other_team(uuid, uuid) to service_role;