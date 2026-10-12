-- BEYOND: replies and likes on comments (run once in the Supabase SQL Editor, after notifications.sql).
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists comments_parent_idx on public.comments (parent_id);
alter table public.notifications add column if not exists detail text check (detail is null or detail in ('reply','comment'));

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;
create policy clikes_read   on public.comment_likes for select to authenticated using (true);
create policy clikes_insert on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
create policy clikes_delete on public.comment_likes for delete to authenticated using (user_id = auth.uid());

-- notify_comment (replaces the earlier version): replies notify the person you replied to
create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid; parent_author uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if new.parent_id is not null then
    select author_id into parent_author from public.comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, post_id, detail) values (parent_author, new.author_id, 'comment', new.post_id, 'reply');
    end if;
  end if;
  if owner is not null and owner <> new.author_id and owner is distinct from parent_author then
    insert into public.notifications (user_id, actor_id, type, post_id) values (owner, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end $$;

create or replace function public.notify_comment_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare c_author uuid; c_post uuid;
begin
  select author_id, post_id into c_author, c_post from public.comments where id = new.comment_id;
  if c_author is not null and c_author <> new.user_id
     and not exists (select 1 from public.notifications n where n.user_id = c_author and n.actor_id = new.user_id and n.type = 'like' and n.detail = 'comment' and n.post_id = c_post) then
    insert into public.notifications (user_id, actor_id, type, post_id, detail) values (c_author, new.user_id, 'like', c_post, 'comment');
  end if;
  return new;
end $$;
create or replace function public.notify_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id
     and not exists (select 1 from public.notifications n where n.user_id = owner and n.actor_id = new.user_id and n.type = 'like' and n.detail is null and n.post_id = new.post_id) then
    insert into public.notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end $$;
revoke execute on function public.notify_comment_like(), public.notify_comment(), public.notify_like() from public, anon, authenticated;
create trigger trg_notify_comment_like after insert on public.comment_likes for each row execute function public.notify_comment_like();
