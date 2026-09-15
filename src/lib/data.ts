import { createClient } from './supabase/server';
import type {
  Category,
  Currency,
  HouseholdMember,
  NotificationSettings,
  PaymentMethod,
  Profile,
  Settings,
  Subscription,
} from './types';

export interface AppData {
  profile: Profile;
  settings: Settings;
  notificationSettings: NotificationSettings;
  currencies: Currency[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  household: HouseholdMember[];
  subscriptions: Subscription[];
}

/**
 * Loads everything the shell and every page needs in one pass.
 *
 * Upstream rebuilds this set on each PHP request via includes/getsettings.php;
 * fetching it once per navigation keeps the same shape while avoiding a
 * waterfall of round trips to Supabase.
 */
export async function loadAppData(): Promise<AppData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    profileRes,
    settingsRes,
    notificationRes,
    currenciesRes,
    categoriesRes,
    paymentMethodsRes,
    householdRes,
    subscriptionsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('settings').select('*').eq('user_id', user.id).single(),
    supabase.from('notification_settings').select('*').eq('user_id', user.id).single(),
    supabase.from('currencies').select('*').eq('user_id', user.id).order('id'),
    supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('payment_methods').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('household').select('*').eq('user_id', user.id).order('id'),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).order('name'),
  ]);

  if (!profileRes.data) return null;

  return {
    profile: profileRes.data as Profile,
    settings: (settingsRes.data ?? defaultSettings(user.id)) as Settings,
    notificationSettings: (notificationRes.data ?? {
      user_id: user.id,
      days: 0,
      period_summary_at_period_start: false,
    }) as NotificationSettings,
    currencies: (currenciesRes.data ?? []) as Currency[],
    categories: (categoriesRes.data ?? []) as Category[],
    paymentMethods: (paymentMethodsRes.data ?? []) as PaymentMethod[],
    household: (householdRes.data ?? []) as HouseholdMember[],
    subscriptions: (subscriptionsRes.data ?? []) as Subscription[],
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

export type { Subscription };
