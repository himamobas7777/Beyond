-- =====================================================================
-- BEYOND: private messages (DMs), inbox, blocking and reporting.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Rules enforced here (not in the app):
--   * you can only message someone you follow AND who follows you back
--   * nobody can message you if either of you blocked the other
--   * messages are text only, 1 to 1000 characters, max 20 per minute
--   * the app can NOT insert or edit messages directly, only through the functions below
-- =====================================================================
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  hidden_by_sender    boolean not null default false,
  hidden_by_recipient boolean not null default false,
  check (sender_id <> recipient_id)
);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index if not exists messages_sender_idx    on public.messages (sender_id, created_at desc);
alter table public.messages enable row level security;

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;

create table if not exists public.message_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reported_id uuid references public.profiles(id) on delete set null,
  reason      text not null default '' check (char_length(reason) <= 200),
  excerpt     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.message_reports enable row level security;   -- no policies: nobody reads it through the app

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='msg_read') then
    create policy msg_read on public.messages for select to authenticated
      using ((sender_id = auth.uid() and not hidden_by_sender) or (recipient_id = auth.uid() and not hidden_by_recipient));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='blocks' and policyname='blk_read') then
    create policy blk_read   on public.blocks for select to authenticated using (blocker_id = auth.uid());
    create policy blk_insert on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
    create policy blk_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());
  end if;
end $$;
revoke insert, update, delete on public.messages from authenticated, anon;
revoke all on public.messages from anon;
revoke all on public.blocks from anon;
revoke update on public.blocks from authenticated;

revoke all on public.message_reports from anon, authenticated;

-- ---------- functions: the only way to send, read-mark, hide and report ----------
create or replace function public.send_message(to_id uuid, msg text) returns public.messages
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); clean text := btrim(coalesce(msg, '')); r public.messages;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if to_id is null or to_id = me then raise exception 'Invalid recipient'; end if;
  if char_length(clean) < 1 or char_length(clean) > 1000 then raise exception 'Message must be 1 to 1000 characters'; end if;
  if not exists (select 1 from public.follows where follower_id = me and following_id = to_id)
     or not exists (select 1 from public.follows where follower_id = to_id and following_id = me) then
    raise exception 'You can only message people who follow you back';
  end if;
  if exists (select 1 from public.blocks where (blocker_id = me and blocked_id = to_id) or (blocker_id = to_id and blocked_id = me)) then
    raise exception 'You can not message this person';
  end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Slow down a little';
  end if;
  insert into public.messages (sender_id, recipient_id, body) values (me, to_id, clean) returning * into r;
  return r;
end $$;

create or replace function public.mark_conversation_read(other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.messages set read_at = now() where recipient_id = auth.uid() and sender_id = other and read_at is null;
end $$;

create or replace function public.hide_conversation(other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.messages set hidden_by_sender = true where sender_id = auth.uid() and recipient_id = other;
  update public.messages set hidden_by_recipient = true where recipient_id = auth.uid() and sender_id = other;
end $$;

create or replace function public.report_conversation(other uuid, why text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  insert into public.message_reports (reporter_id, reported_id, reason, excerpt)
  select me, other, left(coalesce(why, ''), 200),
         coalesce(jsonb_agg(jsonb_build_object('from', m.sender_id, 'body', m.body, 'at', m.created_at) order by m.created_at), '[]'::jsonb)
  from (select * from public.messages
        where ((sender_id = me and recipient_id = other) or (sender_id = other and recipient_id = me))
        order by created_at desc limit 10) m;
end $$;

revoke execute on function public.send_message(uuid, text), public.mark_conversation_read(uuid), public.hide_conversation(uuid), public.report_conversation(uuid, text) from public, anon;
grant execute on function public.send_message(uuid, text), public.mark_conversation_read(uuid), public.hide_conversation(uuid), public.report_conversation(uuid, text) to authenticated;
