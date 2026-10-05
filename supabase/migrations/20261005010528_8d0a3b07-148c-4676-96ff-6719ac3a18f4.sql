REVOKE EXECUTE ON FUNCTION public.directory_like_counts(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.directory_like_counts(uuid[]) TO service_role;