create or replace function public.accept_my_invites()
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare uid uuid := auth.uid(); em text; inv record; joined uuid; seats int; members int;
begin
  if uid is null then return null; end if;
  em := lower(coalesce(auth.jwt() ->> 'email', ''));
  if em = '' then return null; end if;
  for inv in select * from public.workspace_invites
    where lower(email) = em and accepted_at is null and expires_at > now()
    order by created_at loop
    if exists (select 1 from public.workspace_members where workspace_id = inv.workspace_id and user_id = uid) then
      update public.workspace_invites set accepted_at = now() where id = inv.id;
      joined := inv.workspace_id;
      continue;
    end if;
    seats := public.workspace_seats(inv.workspace_id);
    select count(*) into members from public.workspace_members where workspace_id = inv.workspace_id;
    if members >= seats then continue; end if;
    insert into public.workspace_members (workspace_id, user_id, role) values (inv.workspace_id, uid, inv.role);
    update public.workspace_invites set accepted_at = now() where id = inv.id;
    joined := inv.workspace_id;
  end loop;
  return joined;
end $$;
revoke execute on function public.accept_my_invites() from public, anon;
grant execute on function public.accept_my_invites() to authenticated;