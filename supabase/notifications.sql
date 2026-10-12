-- =====================================================================
-- BEYOND: notifications (likes, comments, new followers).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Nobody can create notifications from the app: only the triggers below can.
-- =====================================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,   -- who receives it
  actor_id   uuid references public.profiles(id) on delete cascade,            -- who did it
  type       text not null check (type in ('like','comment','follow')),
  post_id    uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists notif_read   on public.notifications;
drop policy if exists notif_update on public.notifications;
drop policy if exists notif_delete on public.notifications;
create policy notif_read   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
-- people may only change read_at, nothing else
revoke insert, update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id
     and not exists (select 1 from public.notifications n where n.user_id = owner and n.actor_id = new.user_id and n.type = 'like' and n.post_id = new.post_id) then
    insert into public.notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end $$;

create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, post_id) values (owner, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end $$;

create or replace function public.notify_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.notifications n where n.user_id = new.following_id and n.actor_id = new.follower_id and n.type = 'follow') then
    insert into public.notifications (user_id, actor_id, type) values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end $$;

revoke execute on function public.notify_like(), public.notify_comment(), public.notify_follow() from public, anon, authenticated;

drop trigger if exists trg_notify_like    on public.post_likes;
drop trigger if exists trg_notify_comment on public.comments;
drop trigger if exists trg_notify_follow  on public.follows;
create trigger trg_notify_like    after insert on public.post_likes for each row execute function public.notify_like();
create trigger trg_notify_comment after insert on public.comments   for each row execute function public.notify_comment();
create trigger trg_notify_follow  after insert on public.follows    for each row execute function public.notify_follow();
