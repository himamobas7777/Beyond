-- =====================================================================
-- BEYOND: database schema, security rules (RLS) and account deletion.
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (it uses "if not exists" / "drop policy if exists").
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name text not null default '' check (char_length(display_name) <= 40),
  bio          text not null default '' check (char_length(bio) <= 160),
  quest        text not null default '' check (char_length(quest) <= 120),
  stage        text not null default '' check (char_length(stage) <= 20),
  interests    text[] not null default '{}',
  avatar_url   text,
  onboarded    boolean not null default false,
  consent_at   timestamptz,
  min_age      int,
  created_at   timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.opportunities (
  id            text primary key,
  title         text not null,
  org           text not null,
  descr         text not null default '',
  category      text not null,
  mode          text not null default 'Not stated',
  cost          text not null default 'Not stated',
  grade         text not null default 'Not stated',
  eligibility   text not null default 'Not stated',
  deadline      text,
  featured      boolean not null default false,
  published     boolean not null default true,
  url           text check (url is null or url ~ '^https://'),
  tags          text[] not null default '{}',
  last_verified date,
  created_at    timestamptz not null default now()
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('Discovery','Experience','Question','Project','Milestone','Discussion')),
  body       text not null check (char_length(body) between 1 and 500),
  opp_id     text,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.post_saves (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- "Saved" means "I may want to do this". "Completed" means "I did this". They stay separate.
create table if not exists public.saved_opportunities (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  opp_id     text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, opp_id)
);
create table if not exists public.completed_opportunities (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  opp_id       text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, opp_id)
);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references public.posts(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason      text not null default '' check (char_length(reason) <= 200),
  created_at  timestamptz not null default now()
);

-- ---------- row level security: ON for everything ----------
alter table public.profiles                enable row level security;
alter table public.admins                  enable row level security;
alter table public.opportunities           enable row level security;
alter table public.posts                   enable row level security;
alter table public.post_likes              enable row level security;
alter table public.comments                enable row level security;
alter table public.follows                 enable row level security;
alter table public.post_saves              enable row level security;
alter table public.saved_opportunities     enable row level security;
alter table public.completed_opportunities enable row level security;
alter table public.reports                 enable row level security;

-- profiles: signed-in people can see profiles (name, username, bio...). No email is stored here.
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- opportunities: anyone can read published ones. Only admins can change them (enforced here, not just in the UI).
drop policy if exists opp_read  on public.opportunities;
drop policy if exists opp_admin on public.opportunities;
create policy opp_read  on public.opportunities for select to anon, authenticated using (published = true);
create policy opp_admin on public.opportunities for all to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- posts / comments / likes / follows
drop policy if exists posts_read   on public.posts;   drop policy if exists posts_insert   on public.posts;   drop policy if exists posts_delete   on public.posts;
create policy posts_read   on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_delete on public.posts for delete to authenticated using (author_id = auth.uid());

drop policy if exists likes_read   on public.post_likes; drop policy if exists likes_insert on public.post_likes; drop policy if exists likes_delete on public.post_likes;
create policy likes_read   on public.post_likes for select to authenticated using (true);
create policy likes_insert on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete on public.post_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists cm_read on public.comments; drop policy if exists cm_insert on public.comments; drop policy if exists cm_delete on public.comments;
create policy cm_read   on public.comments for select to authenticated using (true);
create policy cm_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy cm_delete on public.comments for delete to authenticated using (author_id = auth.uid());

drop policy if exists fol_read on public.follows; drop policy if exists fol_insert on public.follows; drop policy if exists fol_delete on public.follows;
create policy fol_read   on public.follows for select to authenticated using (true);
create policy fol_insert on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy fol_delete on public.follows for delete to authenticated using (follower_id = auth.uid());

-- private to each person: saved posts, saved/completed opportunities
drop policy if exists psv_all on public.post_saves;
create policy psv_all on public.post_saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists sop_all on public.saved_opportunities;
create policy sop_all on public.saved_opportunities for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists cop_all on public.completed_opportunities;
create policy cop_all on public.completed_opportunities for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: people can file one, nobody can read them through the app. Review them in the Supabase Table Editor.
drop policy if exists rep_insert on public.reports;
create policy rep_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
-- (admins table has RLS on and no policies: it cannot be read or changed from the app at all.)

-- ---------- create a profile automatically when someone signs in with Google for the first time ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id,
          'beyonder_' || substr(replace(new.id::text, '-', ''), 1, 6),
          left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 40))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;  -- only the trigger may call it

-- ---------- real account deletion ("Delete my account and data" button) ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();   -- cascades to the profile and everything linked to it
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- profile photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists avatars_read   on storage.objects;
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;
create policy avatars_read   on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
