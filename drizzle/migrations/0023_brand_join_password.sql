CREATE TABLE private.workspace_join_passwords (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.workspace_join_attempts (
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, workspace_id)
);
REVOKE ALL ON private.workspace_join_passwords, private.workspace_join_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.set_join_password(_ws uuid, _password text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not (public.is_workspace_admin(_ws::text) or public.is_platform_admin()) then raise exception 'Only account owners and admins can change this'; end if;
  if _password is null or btrim(_password) = '' then
    delete from private.workspace_join_passwords where workspace_id = _ws;
    return false;
  end if;
  if length(_password) < 8 or length(_password) > 100 then raise exception 'Use 8 to 100 characters'; end if;
  insert into private.workspace_join_passwords (workspace_id, password_hash, updated_by, updated_at)
  values (_ws, extensions.crypt(_password, extensions.gen_salt('bf')), auth.uid(), now())
  on conflict (workspace_id) do update set password_hash = excluded.password_hash, updated_by = excluded.updated_by, updated_at = now();
  return true;
end $$;

CREATE OR REPLACE FUNCTION private.join_password_info(_ws uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare nm text; on_ boolean;
begin
  if auth.uid() is null then return null; end if;
  select name into nm from public.workspaces where id = _ws and suspended_at is null;
  select exists (select 1 from private.workspace_join_passwords where workspace_id = _ws) into on_;
  if nm is null then return null; end if;
  -- Admins see status; others learn the name only when joining by password is on.
  if public.is_workspace_admin(_ws::text) or public.is_platform_admin() then
    return jsonb_build_object('name', nm, 'enabled', on_, 'member', true);
  end if;
  if not on_ then return null; end if;
  return jsonb_build_object('name', nm, 'enabled', true, 'member', public.is_workspace_member(_ws::text));
end $$;

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
  insert into public.workspace_members (workspace_id, user_id, role) values (_ws, auth.uid(), 'member');
  return _ws;
end $$;

REVOKE ALL ON FUNCTION private.set_join_password(uuid, text), private.join_password_info(uuid), private.join_with_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.set_join_password(uuid, text), private.join_password_info(uuid), private.join_with_password(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_join_password(_ws uuid, _password text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$ BEGIN RETURN private.set_join_password(_ws, _password); END $$;
CREATE OR REPLACE FUNCTION public.join_password_info(_ws uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$ BEGIN RETURN private.join_password_info(_ws); END $$;
CREATE OR REPLACE FUNCTION public.join_with_password(_ws uuid, _password text) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$ BEGIN RETURN private.join_with_password(_ws, _password); END $$;
REVOKE ALL ON FUNCTION public.set_join_password(uuid, text), public.join_password_info(uuid), public.join_with_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_join_password(uuid, text), public.join_password_info(uuid), public.join_with_password(uuid, text) TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;