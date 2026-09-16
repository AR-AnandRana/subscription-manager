-- ============================================================================
-- Admin: the rest of the upstream admin page
--
-- Adds what admin.php stores beyond registrations — SMTP, the webhook
-- allowlist and OIDC — plus the functions the Admin screen needs to list and
-- delete users. Those run as security definer because row level security
-- deliberately hides other people's rows from the client.
-- ============================================================================

-- SMTP + security settings live on the admin singleton, as upstream ---------
alter table public.admin_settings
  add column if not exists smtp_address  text not null default '',
  add column if not exists smtp_port     integer not null default 587,
  add column if not exists smtp_username text not null default '',
  add column if not exists smtp_password text not null default '',
  add column if not exists from_email    text not null default '',
  add column if not exists encryption    text not null default 'tls',
  add column if not exists local_webhook_notifications_allowlist text not null default '',
  add column if not exists allow_standard_users_local_webhooks   boolean not null default false;

-- OIDC / OAuth login --------------------------------------------------------
create table if not exists public.oauth_settings (
  id                      smallint primary key default 1 check (id = 1),
  enabled                 boolean not null default false,
  name                    text not null default '',
  client_id               text not null default '',
  client_secret           text not null default '',
  authorization_url       text not null default '',
  token_url               text not null default '',
  user_info_url           text not null default '',
  redirect_url            text not null default '',
  logout_url              text not null default '',
  user_identifier_field   text not null default 'sub',
  scopes                  text not null default 'openid email profile',
  auth_style              text not null default 'auto',
  auto_create_user        boolean not null default false,
  password_login_disabled boolean not null default false,
  require_email_verified  boolean not null default true,
  updated_at              timestamptz not null default now()
);
insert into public.oauth_settings (id) values (1) on conflict (id) do nothing;

alter table public.oauth_settings enable row level security;

drop policy if exists "oauth_settings: read" on public.oauth_settings;
drop policy if exists "oauth_settings: admin writes" on public.oauth_settings;

-- The login page needs to know whether an OIDC button should appear.
create policy "oauth_settings: read" on public.oauth_settings
  for select using (true);

create policy "oauth_settings: admin writes" on public.oauth_settings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Upstream defaults the AI provider to ChatGPT.
alter table public.ai_settings alter column type set default 'chatgpt';

-- ---------------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

/*
  Upstream treats user id 1 — the first account — as the admin, and that account
  always exists. Here the first account gets is_admin from the sign-up trigger,
  but an install can still end up with no admin at all: the first account was
  deleted, or accounts existed before the trigger did. This hands admin to the
  earliest remaining account in that case, so the Admin tab cannot go missing
  for everyone. It never takes admin away, and never promotes anyone while an
  admin already exists.
*/
create or replace function public.claim_admin_if_none()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  promoted boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;
  if exists (select 1 from public.profiles where is_admin) then
    return false;
  end if;

  update public.profiles
     set is_admin = true
   where id = (select id from public.profiles order by created_at, id limit 1)
     and id = auth.uid()
  returning true into promoted;

  return coalesce(promoted, false);
end;
$$;

create or replace function public.admin_list_users()
returns table (id uuid, username text, email text, is_admin boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  return query
    select p.id, p.username, p.email, p.is_admin, p.created_at
      from public.profiles p
     order by p.created_at, p.id;
end;
$$;

/*
  Deleting the auth user cascades to the profile and everything it owns, which
  is what upstream's "deleting a user will also delete all their subscriptions
  and settings" note describes. An admin cannot delete themselves, mirroring the
  disabled delete button on the first account.
*/
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;
  if target = auth.uid() then
    raise exception 'you cannot delete your own account here';
  end if;

  delete from auth.users where id = target;
end;
$$;

revoke all on function public.claim_admin_if_none() from public;
revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.claim_admin_if_none() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
