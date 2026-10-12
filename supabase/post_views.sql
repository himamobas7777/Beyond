-- BEYOND: how many people viewed a post. Only the number is ever shown, never who.
-- Run once in the Supabase SQL Editor. Nobody can read or write post_views directly: only these two functions can.
create table if not exists public.post_views (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_views enable row level security;   -- no policies: no direct access
revoke select, insert, update, delete on public.post_views from authenticated, anon;

create or replace function public.post_view_counts() returns table (post_id uuid, views bigint)
language sql security definer set search_path = public as $$
  select v.post_id, count(*)::bigint from public.post_views v join public.posts p on p.id = v.post_id
  where v.user_id <> p.author_id group by v.post_id
$$;
revoke all on function public.post_view_counts() from public, anon;
grant execute on function public.post_view_counts() to authenticated;

-- records the signed-in person's views (own posts are ignored, repeats are ignored); returns the ids that were new
create or replace function public.record_post_views(ids uuid[]) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare r uuid[];
begin
  if auth.uid() is null then return '{}'; end if;
  with ins as (
    insert into public.post_views (post_id, user_id)
    select p.id, auth.uid() from public.posts p where p.id = any(ids[1:50]) and p.author_id <> auth.uid()
    on conflict do nothing returning post_id)
  select coalesce(array_agg(post_id), '{}') into r from ins;
  return r;
end $$;
revoke all on function public.record_post_views(uuid[]) from public, anon;
grant execute on function public.record_post_views(uuid[]) to authenticated;
