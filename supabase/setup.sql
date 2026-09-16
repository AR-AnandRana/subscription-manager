-- ============================================================================
-- Wallos on Supabase — complete setup
--
-- Paste this whole file into the Supabase SQL editor and run it once, on a
-- NEW project. It is migrations 0001-0005 concatenated in order.
--
-- ALREADY RAN AN EARLIER VERSION? Do not run this file again — it would fail
-- with `relation "profiles" already exists` and change nothing (the editor
-- rolls the whole script back). Run only the migrations you have not applied
-- yet, from supabase/migrations/, newest last. Each one is additive and safe
-- to re-run on a database that already has it.
--
-- If it fails partway and you want a clean retry, run this first, then re-run
-- the whole file. It drops everything this script creates, and every row in it:
--
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();
--   drop function if exists public.claim_admin_if_none();
--   drop function if exists public.admin_list_users();
--   drop function if exists public.admin_delete_user(uuid);
--   drop function if exists public.is_admin();
--   drop table if exists
--     public.ai_recommendations, public.ai_settings, public.total_yearly_cost,
--     public.last_exchange_update, public.google_search, public.fixer,
--     public.serverchan_notifications, public.pushplus_notifications,
--     public.mattermost_notifications, public.webhook_notifications,
--     public.pushover_notifications, public.ntfy_notifications,
--     public.gotify_notifications, public.telegram_notifications,
--     public.discord_notifications, public.email_notifications,
--     public.notification_settings, public.settings, public.subscriptions,
--     public.household, public.payment_methods, public.categories,
--     public.currencies, public.profiles, public.oauth_settings,
--     public.admin_settings cascade;
-- ============================================================================


-- >>>>> migrations/0001_schema.sql

-- ============================================================================
-- Wallos on Supabase — schema replication
--
-- Ported from the upstream SQLite schema (db/wallos.empty.db + migrations/*).
-- Differences forced by the platform:
--   * `user` becomes `profiles`, keyed by auth.users.id (uuid) instead of an
--     autoincrement integer. Passwords, login_tokens, email_verification,
--     password_resets and totp are handled by Supabase Auth.
--   * Every per-user table keeps its integer surrogate key (subscriptions
--     reference categories / payment methods by integer, as upstream does) and
--     gains a user_id uuid for row level security.
--   * `cycles` and `frequencies` are static lookup data; they live in the
--     client as constants rather than tables.
-- ============================================================================

-- No extensions are required: gen_random_uuid() is built in from Postgres 13,
-- which is what the api_key default below is built from. Relying on pgcrypto's
-- gen_random_bytes() would mean depending on the `extensions` schema being on
-- the search path when the table is created, which is not guaranteed.

-- ---------------------------------------------------------------------------
-- profiles  (upstream: user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  username                  text not null,
  email                     text not null,
  firstname                 text not null default '',
  lastname                  text not null default '',
  main_currency             bigint,
  avatar                    text,
  language                  text not null default 'en',
  budget                    numeric not null default 0,
  period_budget             numeric not null default 0,
  budget_period_type        text not null default 'monthly'
                              check (budget_period_type in ('weekly', 'fortnightly', 'monthly')),
  budget_period_anchor_date date not null default date_trunc('month', now())::date,
  api_key                   text not null
                              default replace(gen_random_uuid()::text, '-', '')
                                   || replace(gen_random_uuid()::text, '-', ''),
  totp_enabled              boolean not null default false,
  is_admin                  boolean not null default false,
  created_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- currencies
-- ---------------------------------------------------------------------------
create table public.currencies (
  id      bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name    text not null,
  symbol  text not null default '',
  code    text not null,
  rate    numeric not null default 1
);
create index currencies_user_idx on public.currencies (user_id);

alter table public.profiles
  add constraint profiles_main_currency_fkey
  foreign key (main_currency) references public.currencies (id) on delete set null;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0
);
create index categories_user_idx on public.categories (user_id);

-- ---------------------------------------------------------------------------
-- payment_methods
-- ---------------------------------------------------------------------------
create table public.payment_methods (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  icon       text,
  sort_order integer not null default 0,
  enabled    boolean not null default true
);
create index payment_methods_user_idx on public.payment_methods (user_id);

-- ---------------------------------------------------------------------------
-- household
-- ---------------------------------------------------------------------------
create table public.household (
  id      bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name    text not null,
  email   text not null default ''
);
create index household_user_idx on public.household (user_id);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                          bigint generated always as identity primary key,
  user_id                     uuid not null references public.profiles (id) on delete cascade,
  name                        text not null,
  logo                        text,
  logo_variant                text,
  logo_text_color             text,
  price                       numeric not null default 0,
  currency_id                 bigint references public.currencies (id) on delete set null,
  start_date                  date,
  next_payment                date,
  cycle                       smallint not null default 3 check (cycle between 1 and 5),
  frequency                   smallint not null default 1 check (frequency between 1 and 31),
  auto_renew                  boolean not null default true,
  notes                       text not null default '',
  url                         text not null default '',
  payment_method_id           bigint references public.payment_methods (id) on delete set null,
  payer_user_id               bigint references public.household (id) on delete set null,
  category_id                 bigint references public.categories (id) on delete set null,
  notify                      boolean not null default false,
  notify_days_before          integer,
  inactive                    boolean not null default false,
  cancellation_date           date,
  replacement_subscription_id bigint references public.subscriptions (id) on delete set null,
  created_at                  timestamptz not null default now()
);
create index subscriptions_user_inactive_next_payment_idx
  on public.subscriptions (user_id, inactive, next_payment);
create index subscriptions_user_notify_inactive_idx
  on public.subscriptions (user_id, notify, inactive);

-- ---------------------------------------------------------------------------
-- settings  (one row per user)
-- ---------------------------------------------------------------------------
create table public.settings (
  user_id                    uuid primary key references public.profiles (id) on delete cascade,
  theme                      text not null default 'automatic'
                               check (theme in ('automatic', 'light', 'dark')),
  color_theme                text not null default 'blue',
  monthly_price              boolean not null default false,
  convert_currency           boolean not null default false,
  remove_background          boolean not null default false,
  hide_disabled              boolean not null default false,
  disabled_to_bottom         boolean not null default false,
  show_original_price        boolean not null default false,
  show_subscription_progress boolean not null default false,
  mobile_nav                 boolean not null default false,
  week_starts_sunday         boolean not null default false,
  upcoming_payments_limit    integer not null default 3
                               check (upcoming_payments_limit in (3, 5, 10, 20)),
  custom_css                 text not null default '',
  main_color                 text,
  accent_color               text,
  hover_color                text
);

-- ---------------------------------------------------------------------------
-- notification settings + channels  (one row per user each)
-- ---------------------------------------------------------------------------
create table public.notification_settings (
  user_id                        uuid primary key references public.profiles (id) on delete cascade,
  days                           integer not null default 0,
  period_summary_at_period_start boolean not null default false
);

create table public.email_notifications (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  enabled       boolean not null default false,
  smtp_address  text not null default '',
  smtp_port     integer not null default 587,
  smtp_username text not null default '',
  smtp_password text not null default '',
  from_email    text not null default '',
  encryption    text not null default 'tls',
  other_emails  text not null default ''
);

create table public.discord_notifications (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  enabled        boolean not null default false,
  webhook_url    text not null default '',
  bot_username   text not null default '',
  bot_avatar_url text not null default ''
);

create table public.telegram_notifications (
  user_id   uuid primary key references public.profiles (id) on delete cascade,
  enabled   boolean not null default false,
  bot_token text not null default '',
  chat_id   text not null default ''
);

create table public.gotify_notifications (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  enabled    boolean not null default false,
  url        text not null default '',
  token      text not null default '',
  ignore_ssl boolean not null default false
);

create table public.ntfy_notifications (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  enabled    boolean not null default false,
  host       text not null default '',
  topic      text not null default '',
  headers    text not null default '',
  ignore_ssl boolean not null default false
);

create table public.pushover_notifications (
  user_id  uuid primary key references public.profiles (id) on delete cascade,
  enabled  boolean not null default false,
  user_key text not null default '',
  token    text not null default ''
);

create table public.webhook_notifications (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  enabled             boolean not null default false,
  url                 text not null default '',
  request_method      text not null default 'POST',
  headers             text not null default '',
  payload             text not null default '',
  cancelation_payload text not null default '',
  ignore_ssl          boolean not null default false
);

create table public.mattermost_notifications (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  enabled        boolean not null default false,
  webhook_url    text not null default '',
  bot_username   text not null default '',
  bot_icon_emoji text not null default ''
);

create table public.pushplus_notifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  token   text not null default ''
);

create table public.serverchan_notifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  sendkey text not null default ''
);

-- ---------------------------------------------------------------------------
-- exchange rate provider + logo search keys
-- ---------------------------------------------------------------------------
create table public.fixer (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  api_key          text not null default '',
  provider         integer not null default 0,
  usage_limit      integer,
  usage_used       integer,
  usage_updated_at timestamptz
);

create table public.google_search (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  api_key text not null default ''
);

create table public.last_exchange_update (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  date    date
);

-- ---------------------------------------------------------------------------
-- AI recommendations
-- ---------------------------------------------------------------------------
create table public.ai_settings (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  type                text not null default 'openai',
  enabled             boolean not null default false,
  api_key             text not null default '',
  model               text not null default '',
  url                 text not null default '',
  run_schedule        text not null default 'manual',
  last_successful_run timestamptz
);

create table public.ai_recommendations (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  description text not null,
  savings     text not null default '',
  created_at  timestamptz not null default now()
);
create index ai_recommendations_user_idx on public.ai_recommendations (user_id);

-- ---------------------------------------------------------------------------
-- total_yearly_cost  (cost trend history)
-- ---------------------------------------------------------------------------
create table public.total_yearly_cost (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  date     text not null,
  cost     numeric not null,
  currency text not null,
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- admin_settings  (singleton, upstream: admin)
-- ---------------------------------------------------------------------------
create table public.admin_settings (
  id                         smallint primary key default 1 check (id = 1),
  registrations_open         boolean not null default true,
  max_users                  integer not null default 0,
  require_email_verification boolean not null default false,
  login_disabled             boolean not null default false,
  server_url                 text not null default '',
  update_notification        boolean not null default false,
  latest_version             text not null default ''
);
insert into public.admin_settings (id) values (1);


-- >>>>> migrations/0002_rls.sql

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


-- >>>>> migrations/0003_seed_new_user.sql

-- ============================================================================
-- New-user provisioning
--
-- Upstream Wallos seeds categories, currencies and payment methods once, at
-- database creation (endpoints/cronjobs/createdatabase.php), because the
-- install is single-tenant. Supabase is multi-tenant, so the same seed data is
-- created per account by a trigger on auth.users.
--
-- The first account to register becomes the admin, mirroring upstream's
-- `$isAdmin = $_SESSION['userId'] == 1`.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_username text;
  eur_id       bigint;
  first_user   boolean;
begin
  new_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1)
  );
  first_user := not exists (select 1 from public.profiles);

  insert into public.profiles (id, username, email, avatar, is_admin)
  values (
    new.id,
    new_username,
    new.email,
    'images/avatars/' || floor(random() * 10)::int || '.svg',
    first_user
  );

  -- Currencies ---------------------------------------------------------------
  insert into public.currencies (user_id, name, symbol, code, rate) values
    (new.id, 'Euro',                   '€',    'EUR', 1),
    (new.id, 'US Dollar',              '$',    'USD', 1),
    (new.id, 'Japanese Yen',           '¥',    'JPY', 1),
    (new.id, 'Bulgarian Lev',          'лв',   'BGN', 1),
    (new.id, 'Czech Republic Koruna',  'Kč',   'CZK', 1),
    (new.id, 'Danish Krone',           'kr',   'DKK', 1),
    (new.id, 'British Pound Sterling', '£',    'GBP', 1),
    (new.id, 'Hungarian Forint',       'Ft',   'HUF', 1),
    (new.id, 'Polish Zloty',           'zł',   'PLN', 1),
    (new.id, 'Romanian Leu',           'lei',  'RON', 1),
    (new.id, 'Swedish Krona',          'kr',   'SEK', 1),
    (new.id, 'Swiss Franc',            'Fr',   'CHF', 1),
    (new.id, 'Icelandic Króna',        'kr',   'ISK', 1),
    (new.id, 'Norwegian Krone',        'kr',   'NOK', 1),
    (new.id, 'Russian Ruble',          '₽',    'RUB', 1),
    (new.id, 'Turkish Lira',           '₺',    'TRY', 1),
    (new.id, 'Australian Dollar',      '$',    'AUD', 1),
    (new.id, 'Brazilian Real',         'R$',   'BRL', 1),
    (new.id, 'Canadian Dollar',        '$',    'CAD', 1),
    (new.id, 'Chinese Yuan',           '¥',    'CNY', 1),
    (new.id, 'Hong Kong Dollar',       'HK$',  'HKD', 1),
    (new.id, 'Indonesian Rupiah',      'Rp',   'IDR', 1),
    (new.id, 'Israeli New Sheqel',     '₪',    'ILS', 1),
    (new.id, 'Indian Rupee',           '₹',    'INR', 1),
    (new.id, 'South Korean Won',       '₩',    'KRW', 1),
    (new.id, 'Mexican Peso',           'Mex$', 'MXN', 1),
    (new.id, 'Malaysian Ringgit',      'RM',   'MYR', 1),
    (new.id, 'New Zealand Dollar',     'NZ$',  'NZD', 1),
    (new.id, 'Philippine Peso',        '₱',    'PHP', 1),
    (new.id, 'Singapore Dollar',       'S$',   'SGD', 1),
    (new.id, 'Thai Baht',              '฿',    'THB', 1),
    (new.id, 'South African Rand',     'R',    'ZAR', 1),
    (new.id, 'Ukrainian Hryvnia',      '₴',    'UAH', 1),
    (new.id, 'New Taiwan Dollar',      'NT$',  'TWD', 1);

  select id into eur_id
  from public.currencies
  where user_id = new.id and code = 'EUR'
  limit 1;

  update public.profiles set main_currency = eur_id where id = new.id;

  -- Categories ---------------------------------------------------------------
  insert into public.categories (user_id, name, sort_order) values
    (new.id, 'No category',          0),
    (new.id, 'Entertainment',        1),
    (new.id, 'Music',                2),
    (new.id, 'Utilities',            3),
    (new.id, 'Food & Beverages',     4),
    (new.id, 'Health & Wellbeing',   5),
    (new.id, 'Productivity',         6),
    (new.id, 'Banking',              7),
    (new.id, 'Transport',            8),
    (new.id, 'Education',            9),
    (new.id, 'Insurance',           10),
    (new.id, 'Gaming',              11),
    (new.id, 'News & Magazines',    12),
    (new.id, 'Software',            13),
    (new.id, 'Technology',          14),
    (new.id, 'Cloud Services',      15),
    (new.id, 'Charity & Donations', 16);

  -- Payment methods ----------------------------------------------------------
  insert into public.payment_methods (user_id, name, icon, sort_order) values
    (new.id, 'PayPal',        'images/uploads/icons/paypal.png',       1),
    (new.id, 'Credit Card',   'images/uploads/icons/creditcard.png',   2),
    (new.id, 'Bank Transfer', 'images/uploads/icons/banktransfer.png', 3),
    (new.id, 'Direct Debit',  'images/uploads/icons/directdebit.png',  4),
    (new.id, 'Money',         'images/uploads/icons/money.png',        5),
    (new.id, 'Google Pay',    'images/uploads/icons/googlepay.png',    6),
    (new.id, 'Samsung Pay',   'images/uploads/icons/samsungpay.png',   7),
    (new.id, 'Apple Pay',     'images/uploads/icons/applepay.png',     8),
    (new.id, 'Crypto',        'images/uploads/icons/crypto.png',       9),
    (new.id, 'Klarna',        'images/uploads/icons/klarna.png',      10),
    (new.id, 'Amazon Pay',    'images/uploads/icons/amazonpay.png',   11),
    (new.id, 'SEPA',          'images/uploads/icons/sepa.png',        12),
    (new.id, 'Skrill',        'images/uploads/icons/skrill.png',      13),
    (new.id, 'Sofort',        'images/uploads/icons/sofort.png',      14),
    (new.id, 'Stripe',        'images/uploads/icons/stripe.png',      15),
    (new.id, 'Affirm',        'images/uploads/icons/affirm.png',      16),
    (new.id, 'AliPay',        'images/uploads/icons/alipay.png',      17),
    (new.id, 'Elo',           'images/uploads/icons/elo.png',         18),
    (new.id, 'Facebook Pay',  'images/uploads/icons/facebookpay.png', 19),
    (new.id, 'GiroPay',       'images/uploads/icons/giropay.png',     20),
    (new.id, 'iDeal',         'images/uploads/icons/ideal.png',       21),
    (new.id, 'Union Pay',     'images/uploads/icons/unionpay.png',    22),
    (new.id, 'Interac',       'images/uploads/icons/interac.png',     23),
    (new.id, 'WeChat',        'images/uploads/icons/wechat.png',      24),
    (new.id, 'Paysafe',       'images/uploads/icons/paysafe.png',     25),
    (new.id, 'Poli',          'images/uploads/icons/poli.png',        26),
    (new.id, 'Qiwi',          'images/uploads/icons/qiwi.png',        27),
    (new.id, 'ShopPay',       'images/uploads/icons/shoppay.png',     28),
    (new.id, 'Venmo',         'images/uploads/icons/venmo.png',       29),
    (new.id, 'VeriFone',      'images/uploads/icons/verifone.png',    30),
    (new.id, 'WebMoney',      'images/uploads/icons/webmoney.png',    31);

  -- The account holder is the first household member ("Paid by" default).
  insert into public.household (user_id, name, email) values (new.id, new_username, new.email);

  -- Singleton settings rows ---------------------------------------------------
  insert into public.settings (user_id) values (new.id);
  insert into public.notification_settings (user_id) values (new.id);
  insert into public.email_notifications (user_id) values (new.id);
  insert into public.discord_notifications (user_id) values (new.id);
  insert into public.telegram_notifications (user_id) values (new.id);
  insert into public.gotify_notifications (user_id) values (new.id);
  insert into public.ntfy_notifications (user_id) values (new.id);
  insert into public.pushover_notifications (user_id) values (new.id);
  insert into public.webhook_notifications (user_id) values (new.id);
  insert into public.mattermost_notifications (user_id) values (new.id);
  insert into public.pushplus_notifications (user_id) values (new.id);
  insert into public.serverchan_notifications (user_id) values (new.id);
  insert into public.fixer (user_id) values (new.id);
  insert into public.google_search (user_id) values (new.id);
  insert into public.ai_settings (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- >>>>> migrations/0004_storage.sql

-- ============================================================================
-- Storage buckets
--
-- Upstream writes uploads to images/uploads/logos and images/uploads/avatars on
-- the web server's disk. Here they are objects in Supabase Storage.
--
-- Both buckets are public to read: a logo is shown on every card and an avatar
-- in the header, and serving them through signed URLs would mean re-signing on
-- every render for no privacy gain. Writes stay restricted to the owner, whose
-- id is the first path segment.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- storage.objects outlives the public tables, so these policies survive a
-- teardown of this schema. Dropping them first keeps the script re-runnable.
drop policy if exists "logos: public read" on storage.objects;
drop policy if exists "logos: owner writes" on storage.objects;
drop policy if exists "logos: owner updates" on storage.objects;
drop policy if exists "logos: owner deletes" on storage.objects;
drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "avatars: owner writes" on storage.objects;
drop policy if exists "avatars: owner updates" on storage.objects;
drop policy if exists "avatars: owner deletes" on storage.objects;

-- Anyone may read; only the owner may write into their own folder.
create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: owner writes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos: owner updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner writes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- >>>>> migrations/0005_admin.sql

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
