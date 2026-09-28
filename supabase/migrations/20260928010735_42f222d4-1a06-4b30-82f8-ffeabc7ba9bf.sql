REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.workspace_member_list(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.workspace_seats(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.accept_invite(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.invite_seat_check() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_member_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_seats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;