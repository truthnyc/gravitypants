alter table public.directory_reels
  add column if not exists pending_video_url text,
  add column if not exists pending_status text not null default 'none',
  add column if not exists pending_submitted_at timestamptz,
  add column if not exists pending_note text;

alter table public.directory_reels drop constraint if exists directory_reels_pending_status_check;
alter table public.directory_reels add constraint directory_reels_pending_status_check
  check (pending_status in ('none', 'in_review', 'declined'));

-- Live videos only change through staff approval; owners submit a pending replacement instead.
create or replace function public.guard_reel_video_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_platform_admin() then return new; end if;
  if old.status = 'live' and old.video_url is not null and new.video_url is distinct from old.video_url then
    raise exception 'LIVE_VIDEO_LOCKED';
  end if;
  if new.pending_status = 'declined' and old.pending_status is distinct from 'declined' then
    raise exception 'PENDING_DECISION_STAFF_ONLY';
  end if;
  if new.pending_note is distinct from old.pending_note and new.pending_status <> 'none' then
    raise exception 'PENDING_DECISION_STAFF_ONLY';
  end if;
  return new;
end $$;
revoke execute on function public.guard_reel_video_update() from public, anon, authenticated;
drop trigger if exists guard_reel_video_update on public.directory_reels;
create trigger guard_reel_video_update before update on public.directory_reels
  for each row execute function public.guard_reel_video_update();