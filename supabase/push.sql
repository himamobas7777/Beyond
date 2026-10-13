-- =====================================================================
-- BEYOND: web push notifications (alerts when the site is closed).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Also needs the Edge Function in supabase/functions/push/index.ts (deploy it once).
-- Design:
--   * a person subscribes from Settings; their browser address is saved in push_subscriptions (only they can see or delete it)
--   * when a notification or a private message is created, a trigger calls the Edge Function with only the row id
--   * the function holds the VAPID keys (stored in push_config, which nobody can read through the app) and sends the alert
--   * alerts never include message text, only "Sara sent you a message"
-- =====================================================================
create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  lang       text not null default 'en' check (char_length(lang) <= 8),
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

create table if not exists public.push_config (
  key   text primary key,
  value text not null
);
alter table public.push_config enable row level security;   -- no policies: nobody reads it through the app
revoke all on public.push_config from anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_read') then
    create policy push_read   on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
    create policy push_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;
revoke all on public.push_subscriptions from anon;
revoke insert, update on public.push_subscriptions from authenticated;

-- a random secret that only the database and the Edge Function know
insert into public.push_config (key, value) values ('trigger_secret', encode(extensions.gen_random_bytes(32), 'hex')) on conflict (key) do nothing;

-- ---------- subscribe (the only way to add a subscription; also moves it if a shared device changes account) ----------
create or replace function public.save_push_subscription(ep text, p256dh_key text, auth_key text, lang_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, lang)
  values (auth.uid(), ep, p256dh_key, auth_key, left(coalesce(lang_code, 'en'), 8))
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
end $$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- ---------- triggers: tell the Edge Function that something new happened (never blocks the original action) ----------
create or replace function public.push_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare secret text; target uuid;
begin
  if TG_ARGV[0] = 'message' then target := new.recipient_id; else target := new.user_id; end if;
  if not exists (select 1 from public.push_subscriptions where user_id = target) then return new; end if;
  select value into secret from public.push_config where key = 'trigger_secret';
  if secret is null then return new; end if;
  perform net.http_post(
    url := 'https://zyfinpacnbyylwgcpqud.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object('kind', TG_ARGV[0], 'id', new.id));
  return new;
exception when others then
  return new;
end $$;
revoke execute on function public.push_trigger() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'push_on_notification') then
    create trigger push_on_notification after insert on public.notifications for each row execute function public.push_trigger('notification');
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'push_on_message') then
    create trigger push_on_message after insert on public.messages for each row execute function public.push_trigger('message');
  end if;
end $$;
