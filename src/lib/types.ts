import type { BudgetPeriodType, ColorTheme, Theme } from './constants';

export interface Profile {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  main_currency: number | null;
  avatar: string | null;
  language: string;
  budget: number;
  period_budget: number;
  budget_period_type: BudgetPeriodType;
  budget_period_anchor_date: string;
  api_key: string;
  totp_enabled: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Currency {
  id: number;
  user_id: string;
  name: string;
  symbol: string;
  code: string;
  rate: number;
}

export interface Category {
  id: number;
  user_id: string;
  name: string;
  sort_order: number;
}

export interface PaymentMethod {
  id: number;
  user_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  enabled: boolean;
}

export interface HouseholdMember {
  id: number;
  user_id: string;
  name: string;
  email: string;
}

export interface Subscription {
  id: number;
  user_id: string;
  name: string;
  logo: string | null;
  logo_variant: string | null;
  logo_text_color: string | null;
  price: number;
  currency_id: number | null;
  start_date: string | null;
  next_payment: string | null;
  cycle: number;
  frequency: number;
  auto_renew: boolean;
  notes: string;
  url: string;
  payment_method_id: number | null;
  payer_user_id: number | null;
  category_id: number | null;
  notify: boolean;
  notify_days_before: number | null;
  inactive: boolean;
  cancellation_date: string | null;
  replacement_subscription_id: number | null;
  created_at: string;
}

export interface Settings {
  user_id: string;
  theme: Theme;
  color_theme: ColorTheme;
  monthly_price: boolean;
  convert_currency: boolean;
  remove_background: boolean;
  hide_disabled: boolean;
  disabled_to_bottom: boolean;
  show_original_price: boolean;
  show_subscription_progress: boolean;
  mobile_nav: boolean;
  week_starts_sunday: boolean;
  upcoming_payments_limit: number;
  custom_css: string;
  main_color: string | null;
  accent_color: string | null;
  hover_color: string | null;
}

export interface NotificationSettings {
  user_id: string;
  days: number;
  period_summary_at_period_start: boolean;
}

/** Every notification channel row, keyed by its table name. */
export interface NotificationChannels {
  email_notifications: Record<string, unknown> & { enabled: boolean };
  discord_notifications: Record<string, unknown> & { enabled: boolean };
  telegram_notifications: Record<string, unknown> & { enabled: boolean };
  gotify_notifications: Record<string, unknown> & { enabled: boolean };
  ntfy_notifications: Record<string, unknown> & { enabled: boolean };
  pushover_notifications: Record<string, unknown> & { enabled: boolean };
  webhook_notifications: Record<string, unknown> & { enabled: boolean };
  mattermost_notifications: Record<string, unknown> & { enabled: boolean };
  pushplus_notifications: Record<string, unknown> & { enabled: boolean };
  serverchan_notifications: Record<string, unknown> & { enabled: boolean };
}

export type ChannelTable = keyof NotificationChannels;

export interface Fixer {
  user_id: string;
  api_key: string;
  /** 0 = fixer.io, 1 = apilayer.com, as upstream stores it. */
  provider: number;
  usage_limit?: number | null;
  usage_used?: number | null;
  usage_updated_at?: string | null;
}

export interface GoogleSearch {
  user_id: string;
  api_key: string;
}

export interface AiSettings {
  user_id: string;
  type: string;
  enabled: boolean;
  api_key: string;
  model: string;
  url: string;
  run_schedule: string;
  last_successful_run: string | null;
}

export interface AiRecommendation {
  id: number;
  user_id: string;
  type: string;
  title: string;
  description: string;
  savings: string;
  created_at: string;
}

export interface AdminSettings {
  id: number;
  registrations_open: boolean;
  max_users: number;
  require_email_verification: boolean;
  login_disabled: boolean;
  server_url: string;
  update_notification: boolean;
  latest_version: string;
  smtp_address: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  encryption: string;
  local_webhook_notifications_allowlist: string;
  allow_standard_users_local_webhooks: boolean;
}

export interface OauthSettings {
  id: number;
  enabled: boolean;
  name: string;
  client_id: string;
  client_secret: string;
  authorization_url: string;
  token_url: string;
  user_info_url: string;
  redirect_url: string;
  logout_url: string;
  user_identifier_field: string;
  scopes: string;
  auth_style: string;
  auto_create_user: boolean;
  password_login_disabled: boolean;
  require_email_verified: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

/** A subscription joined with the lookup rows the UI needs to render it. */
export interface SubscriptionView extends Subscription {
  currency_code: string;
  currency_symbol: string;
  payment_method_name: string;
  payment_method_icon: string | null;
  category_name: string;
  payer_name: string;
  /** Price converted to the user's main currency. */
  converted_price: number;
  /** Monthly-equivalent cost in the main currency. */
  monthly_price: number;
  /** What the card shows, after the convert / monthly display settings. */
  display_price: number;
  display_currency_code: string;
  billing_cycle: string;
  one_time: boolean;
  progress: number;
}
