-- ============================================================================
-- Row level security
--
-- Upstream Wallos scopes every query with `WHERE user_id = :userId`. Here that
-- scoping is enforced by the database instead, so a compromised client cannot
-- read another tenant's rows.
-- ============================================================================

-- profiles ------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- Household members need to resolve each other's display names in a shared
-- install, but Wallos is single-tenant per account, so no cross-user read.

-- Per-user tables keyed by user_id ------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'currencies', 'categories', 'payment_methods', 'household', 'subscriptions',
    'settings', 'notification_settings', 'email_notifications',
    'discord_notifications', 'telegram_notifications', 'gotify_notifications',
    'ntfy_notifications', 'pushover_notifications', 'webhook_notifications',
    'mattermost_notifications', 'pushplus_notifications',
    'serverchan_notifications', 'fixer', 'google_search',
    'last_exchange_update', 'ai_settings', 'ai_recommendations',
    'total_yearly_cost'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    -- Policy names are identifiers, so %I (double-quoted), not %L.
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || ': own rows', t
    );
  end loop;
end
$$;

-- admin_settings ------------------------------------------------------------
-- Readable by any signed-in user (the registration page needs to know whether
-- registrations are open); writable only by an admin profile.
alter table public.admin_settings enable row level security;

create policy "admin_settings: read" on public.admin_settings
  for select using (true);

create policy "admin_settings: admin writes" on public.admin_settings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
