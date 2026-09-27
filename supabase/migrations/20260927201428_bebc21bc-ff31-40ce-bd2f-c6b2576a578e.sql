revoke execute on function public.create_workspace_billing() from public, anon, authenticated;
revoke execute on function public.export_status(uuid) from public, anon;
revoke execute on function public.record_export(uuid, uuid, text) from public, anon;
revoke execute on function public.can_save_export(text, text) from public, anon;
grant execute on function public.export_status(uuid) to authenticated;
grant execute on function public.record_export(uuid, uuid, text) to authenticated;
grant execute on function public.can_save_export(text, text) to authenticated;