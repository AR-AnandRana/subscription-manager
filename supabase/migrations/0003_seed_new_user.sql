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
