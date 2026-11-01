CREATE OR REPLACE FUNCTION private.join_with_password(_ws uuid, _password text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
declare h text; a private.workspace_join_attempts; seats int; members int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.workspace_members where workspace_id = _ws and user_id = auth.uid()) then return _ws; end if;
  select password_hash into h from private.workspace_join_passwords where workspace_id = _ws;
  if h is null then raise exception 'Joining by password is off for this brand'; end if;
  insert into private.workspace_join_attempts (user_id, workspace_id) values (auth.uid(), _ws) on conflict do nothing;
  select * into a from private.workspace_join_attempts where user_id = auth.uid() and workspace_id = _ws for update;
  if a.window_started_at < now() - interval '15 minutes' then
    update private.workspace_join_attempts set window_started_at = now(), attempts = 0 where user_id = auth.uid() and workspace_id = _ws;
    a.attempts := 0;
  end if;
  if a.attempts >= 5 then raise exception 'Too many tries. Wait 15 minutes and try again'; end if;
  if extensions.crypt(coalesce(_password, ''), h) <> h then
    update private.workspace_join_attempts set attempts = attempts + 1 where user_id = auth.uid() and workspace_id = _ws;
    return null;
  end if;
  delete from private.workspace_join_attempts where user_id = auth.uid() and workspace_id = _ws;
  if public.in_other_team(auth.uid(), _ws) is not null then raise exception 'Already a member of another team'; end if;
  seats := private.workspace_seats(_ws);
  select count(*) into members from public.workspace_members where workspace_id = _ws;
  if members >= seats then raise exception 'This brand has no free seats. Ask its owner to add one'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (_ws, auth.uid(), 'editor');
  return _ws;
end $$;