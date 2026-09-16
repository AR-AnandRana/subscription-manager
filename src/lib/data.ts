import { createClient } from './supabase/server';
import { loadI18n, type I18n } from './i18n';
import type {
  AdminSettings,
  AdminUser,
  AiRecommendation,
  AiSettings,
  Category,
  Currency,
  Fixer,
  GoogleSearch,
  HouseholdMember,
  NotificationChannels,
  NotificationSettings,
  OauthSettings,
  PaymentMethod,
  Profile,
  Settings,
  Subscription,
} from './types';

export interface AppData {
  profile: Profile;
  settings: Settings;
  notificationSettings: NotificationSettings;
  channels: NotificationChannels;
  currencies: Currency[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  household: HouseholdMember[];
  subscriptions: Subscription[];
  fixer: Fixer;
  googleSearch: GoogleSearch;
  aiSettings: AiSettings;
  aiRecommendations: AiRecommendation[];
  lastExchangeUpdate: string | null;
  i18n: I18n;
  /** Present only for an admin; the Admin page renders from it. */
  admin: { settings: AdminSettings; oauth: OauthSettings; users: AdminUser[] } | null;
}

const CHANNEL_TABLES = [
  'email_notifications',
  'discord_notifications',
  'telegram_notifications',
  'gotify_notifications',
  'ntfy_notifications',
  'pushover_notifications',
  'webhook_notifications',
  'mattermost_notifications',
  'pushplus_notifications',
  'serverchan_notifications',
] as const;

/**
 * Loads everything the shell and every page needs in one pass.
 *
 * Upstream rebuilds this set on each PHP request via includes/getsettings.php.
 * Fetching it once per navigation keeps the same shape, lets every page render
 * on the server with its data already in hand, and avoids a waterfall of round
 * trips to Supabase.
 */
export async function loadAppData(): Promise<AppData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let profile = (await supabase.from('profiles').select('*').eq('id', user.id).single()).data as
    | Profile
    | null;
  if (!profile) return null;

  // An install with no admin at all (first account deleted, or accounts created
  // before the trigger existed) would hide the Admin page from everyone.
  if (!profile.is_admin) {
    const { data: promoted } = await supabase.rpc('claim_admin_if_none');
    if (promoted) {
      profile = ((await supabase.from('profiles').select('*').eq('id', user.id).single()).data ??
        profile) as Profile;
    }
  }

  const [
    settingsRes,
    notificationRes,
    currenciesRes,
    categoriesRes,
    paymentMethodsRes,
    householdRes,
    subscriptionsRes,
    fixerRes,
    googleRes,
    aiRes,
    aiRecommendationsRes,
    lastExchangeRes,
    channelRows,
    i18n,
  ] = await Promise.all([
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('currencies').select('*').eq('user_id', user.id).order('id'),
    supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order').order('id'),
    supabase.from('payment_methods').select('*').eq('user_id', user.id).order('sort_order').order('id'),
    supabase.from('household').select('*').eq('user_id', user.id).order('id'),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).order('name'),
    supabase.from('fixer').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('google_search').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('ai_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('ai_recommendations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('last_exchange_update').select('date').eq('user_id', user.id).maybeSingle(),
    Promise.all(
      CHANNEL_TABLES.map((table) =>
        supabase.from(table).select('*').eq('user_id', user.id).maybeSingle(),
      ),
    ),
    loadI18n(profile.language),
  ]);

  const channels = Object.fromEntries(
    CHANNEL_TABLES.map((table, index) => [
      table,
      (channelRows[index].data ?? { user_id: user.id, enabled: false }) as Record<string, unknown>,
    ]),
  ) as unknown as NotificationChannels;

  let admin: AppData['admin'] = null;
  if (profile.is_admin) {
    const [adminRes, oauthRes, usersRes] = await Promise.all([
      supabase.from('admin_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('oauth_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.rpc('admin_list_users'),
    ]);
    if (adminRes.data) {
      admin = {
        settings: adminRes.data as AdminSettings,
        oauth: (oauthRes.data ?? defaultOauth()) as OauthSettings,
        users: (usersRes.data ?? []) as AdminUser[],
      };
    }
  }

  return {
    profile,
    settings: (settingsRes.data ?? defaultSettings(user.id)) as Settings,
    notificationSettings: (notificationRes.data ?? {
      user_id: user.id,
      days: 1,
      period_summary_at_period_start: false,
    }) as NotificationSettings,
    channels,
    currencies: (currenciesRes.data ?? []) as Currency[],
    categories: (categoriesRes.data ?? []) as Category[],
    paymentMethods: (paymentMethodsRes.data ?? []) as PaymentMethod[],
    household: (householdRes.data ?? []) as HouseholdMember[],
    subscriptions: (subscriptionsRes.data ?? []) as Subscription[],
    fixer: (fixerRes.data ?? { user_id: user.id, api_key: '', provider: 0 }) as Fixer,
    googleSearch: (googleRes.data ?? { user_id: user.id, api_key: '' }) as GoogleSearch,
    aiSettings: (aiRes.data ?? defaultAiSettings(user.id)) as AiSettings,
    aiRecommendations: (aiRecommendationsRes.data ?? []) as AiRecommendation[],
    lastExchangeUpdate: (lastExchangeRes.data?.date as string | undefined) ?? null,
    i18n,
    admin,
  };
}

function defaultSettings(userId: string): Settings {
  return {
    user_id: userId,
    theme: 'automatic',
    color_theme: 'blue',
    monthly_price: false,
    convert_currency: false,
    remove_background: false,
    hide_disabled: false,
    disabled_to_bottom: false,
    show_original_price: false,
    show_subscription_progress: false,
    mobile_nav: false,
    week_starts_sunday: false,
    upcoming_payments_limit: 3,
    custom_css: '',
    main_color: null,
    accent_color: null,
    hover_color: null,
  };
}

function defaultAiSettings(userId: string): AiSettings {
  return {
    user_id: userId,
    type: 'chatgpt',
    enabled: false,
    api_key: '',
    model: '',
    url: '',
    run_schedule: 'manual',
    last_successful_run: null,
  };
}

function defaultOauth(): OauthSettings {
  return {
    id: 1,
    enabled: false,
    name: '',
    client_id: '',
    client_secret: '',
    authorization_url: '',
    token_url: '',
    user_info_url: '',
    redirect_url: '',
    logout_url: '',
    user_identifier_field: 'sub',
    scopes: 'openid email profile',
    auth_style: 'auto',
    auto_create_user: false,
    password_login_disabled: false,
    require_email_verified: true,
  };
}

export type { Subscription };
