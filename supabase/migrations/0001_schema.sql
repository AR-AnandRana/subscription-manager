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
