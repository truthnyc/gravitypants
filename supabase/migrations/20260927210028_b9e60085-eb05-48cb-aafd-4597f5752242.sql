revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.has_support_session(text) from public, anon;
revoke execute on function public.log_support_write() from public, anon, authenticated;
revoke execute on function public.export_status(uuid) from public, anon;