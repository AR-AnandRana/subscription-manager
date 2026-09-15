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
  billing_cycle: string;
  one_time: boolean;
  progress: number;
}
