'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from './AppDataProvider';
import { logoSrc } from './SubscriptionLogo';
import { showErrorMessage, showSuccessMessage } from './Toast';
import { CYCLES, CYCLE_ONE_TIME, FREQUENCIES } from '@/lib/constants';
import { toDateString } from '@/lib/dates';
import { createSubscription, updateSubscription, uploadLogo, type SubscriptionInput } from '@/lib/actions';
import type { SubscriptionView } from '@/lib/types';

interface Props {
  open: boolean;
  /** null means "add", a subscription means "edit". */
  subscription: SubscriptionView | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  logo: string | null;
  price: string;
  currency_id: number;
  cycle: number;
  frequency: number;
  auto_renew: boolean;
  start_date: string;
  next_payment: string;
  payment_method_id: number | null;
  payer_user_id: number | null;
  category_id: number | null;
  notify: boolean;
  notify_days_before: string;
  cancellation_date: string;
  url: string;
  notes: string;
  inactive: boolean;
  replacement_subscription_id: number | null;
}

/**
 * Add / edit sheet. The field order, grouping and class names follow
 * subscriptions.php so the upstream stylesheet drives the layout.
 */
export function SubscriptionForm({ open, subscription, onClose, onSaved }: Props) {
  if (!open) return null;
  // Keying on the subscription remounts the body when you switch rows, so the
  // fields re-initialise from the new record without an effect to reset them.
  return (
    <SubscriptionFormBody
      key={subscription?.id ?? 'new'}
      subscription={subscription}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function SubscriptionFormBody({
  subscription,
  onClose,
  onSaved,
}: Omit<Props, 'open'>) {
  const { currencies, categories, paymentMethods, household, profile, views } = useAppData();
  const [form, setForm] = useState<FormState>(() =>
    initialState(subscription, profile.main_currency, paymentMethods[0]?.id ?? null, household[0]?.id ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  const isOneTime = form.cycle === CYCLE_ONE_TIME;

  const replacementOptions = useMemo(
    () => views.filter((s) => !s.inactive && s.id !== subscription?.id),
    [views, subscription?.id],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Step the start date forward by whole cycles until it lands in the future —
   * the same walk the upstream autofill button does.
   */
  function autofillNextPayment() {
    if (!form.start_date || isOneTime) return;
    const start = new Date(form.start_date);
    if (Number.isNaN(start.getTime())) return;

    const now = new Date();
    const next = new Date(start);
    let safety = 0;
    while (next <= now && safety < 1000) {
      if (form.cycle === 1) next.setDate(next.getDate() + form.frequency);
      else if (form.cycle === 2) next.setDate(next.getDate() + 7 * form.frequency);
      else if (form.cycle === 3) next.setMonth(next.getMonth() + form.frequency);
      else if (form.cycle === 4) next.setFullYear(next.getFullYear() + form.frequency);
      else break;
      safety += 1;
    }
    set('next_payment', toDateString(next));
  }

  async function onLogoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      set('logo', await uploadLogo(file));
    } catch {
      showErrorMessage('Could not upload the logo');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      showErrorMessage('Please enter a name');
      return;
    }
    if (!form.next_payment) {
      showErrorMessage('Please enter a next payment date');
      return;
    }

    setSaving(true);
    const payload: SubscriptionInput = {
      name: form.name.trim(),
      logo: form.logo,
      logo_variant: subscription?.logo_variant ?? null,
      logo_text_color: subscription?.logo_text_color ?? null,
      price: Number(form.price) || 0,
      currency_id: form.currency_id,
      start_date: form.start_date || null,
      next_payment: form.next_payment,
      cycle: form.cycle,
      // A one-time purchase has no repeat interval, so frequency is meaningless.
      frequency: isOneTime ? 1 : form.frequency,
      auto_renew: isOneTime ? false : form.auto_renew,
      notes: form.notes,
      url: form.url,
      payment_method_id: form.payment_method_id,
      payer_user_id: form.payer_user_id,
      category_id: form.category_id,
      notify: isOneTime ? false : form.notify,
      notify_days_before: form.notify_days_before === '' ? null : Number(form.notify_days_before),
      // One-time purchases have no recurring commitment to cancel.
      cancellation_date: isOneTime ? null : form.cancellation_date || null,
      inactive: form.inactive,
      replacement_subscription_id: form.inactive ? form.replacement_subscription_id : null,
    };

    try {
      if (subscription) await updateSubscription(subscription.id, payload);
      else await createSubscription(payload);
      showSuccessMessage(subscription ? 'Subscription updated' : 'Subscription added');
      onSaved();
      onClose();
    } catch {
      showErrorMessage('Could not save the subscription');
    } finally {
      setSaving(false);
    }
  }

  const logoPreview = logoSrc(form.logo);

  return (
    <>
      <section className="subscription-form is-open" id="subscription-form">
        <form onSubmit={onSubmit}>
          <h3>
            {subscription ? 'Edit subscription' : 'Add subscription'}
            <span className="fa-solid fa-xmark close-form" onClick={onClose} role="button" aria-label="Close" />
          </h3>

          <div className="form-group-inline">
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Name"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              required
            />
            <label htmlFor="logo" className="logo-preview">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="logo" />
              ) : (
                <span>{uploading ? 'Uploading…' : 'Upload Logo'}</span>
              )}
            </label>
            <input type="file" name="logo" id="logo" accept="image/*" onChange={onLogoSelected} className="hidden-input" />
          </div>

          <div className="form-group-inline">
            <input
              type="number"
              step="0.01"
              min="0"
              name="price"
              id="price"
              placeholder="Price"
              value={form.price}
              onChange={(event) => set('price', event.target.value)}
              required
            />
            <select
              name="currency_id"
              id="currency_id"
              value={form.currency_id}
              onChange={(event) => set('currency_id', Number(event.target.value))}
            >
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <div className="inline">
              <div className="split66">
                <label htmlFor="frequency">Payment every</label>
                <div className="inline">
                  {!isOneTime && (
                    <select
                      name="frequency"
                      id="frequency"
                      value={form.frequency}
                      onChange={(event) => set('frequency', Number(event.target.value))}
                    >
                      {FREQUENCIES.map((frequency) => (
                        <option key={frequency} value={frequency}>
                          {frequency}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    name="cycle"
                    id="cycle"
                    value={form.cycle}
                    onChange={(event) => set('cycle', Number(event.target.value))}
                  >
                    {CYCLES.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycleLabel(cycle.id)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!isOneTime && (
                <div className="split33" id="auto-renew-group">
                  <label htmlFor="auto_renew">Auto Renewal</label>
                  <div className="inline height50">
                    <input
                      type="checkbox"
                      name="auto_renew"
                      id="auto_renew"
                      className="toggle-switch"
                      checked={form.auto_renew}
                      onChange={(event) => set('auto_renew', event.target.checked)}
                    />
                    <label htmlFor="auto_renew">Automatically renews</label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <div className="inline">
              <div className="split50">
                <label htmlFor="start_date">Start Date</label>
                <div className="date-wrapper">
                  <input
                    type="date"
                    name="start_date"
                    id="start_date"
                    value={form.start_date}
                    onChange={(event) => set('start_date', event.target.value)}
                  />
                </div>
              </div>
              {!isOneTime && (
                <button
                  type="button"
                  className="button secondary-button autofill-next-payment"
                  title="Calculate next payment from the start date"
                  onClick={autofillNextPayment}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" />
                </button>
              )}
              <div className="split50">
                <label htmlFor="next_payment" className="split-label">
                  {isOneTime ? 'Purchase Date' : 'Next Payment'}
                </label>
                <div className="date-wrapper">
                  <input
                    type="date"
                    name="next_payment"
                    id="next_payment"
                    value={form.next_payment}
                    onChange={(event) => set('next_payment', event.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <div className="inline">
              <div className="split50">
                <label htmlFor="payment_method_id">Payment Method</label>
                <select
                  name="payment_method_id"
                  id="payment_method_id"
                  value={form.payment_method_id ?? ''}
                  onChange={(event) =>
                    set('payment_method_id', event.target.value ? Number(event.target.value) : null)
                  }
                >
                  {paymentMethods
                    .filter((method) => method.enabled || method.id === form.payment_method_id)
                    .map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="split50">
                <label htmlFor="payer_user_id">Paid by</label>
                <select
                  name="payer_user_id"
                  id="payer_user_id"
                  value={form.payer_user_id ?? ''}
                  onChange={(event) =>
                    set('payer_user_id', event.target.value ? Number(event.target.value) : null)
                  }
                >
                  {household.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category_id">Category</label>
            <select
              name="category_id"
              id="category_id"
              value={form.category_id ?? ''}
              onChange={(event) => set('category_id', event.target.value ? Number(event.target.value) : null)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {!isOneTime && (
            <>
              <div className="form-group" id="notifications-group">
                <div className="inline height50">
                  <input
                    type="checkbox"
                    name="notifications"
                    id="notifications"
                    className="toggle-switch"
                    checked={form.notify}
                    onChange={(event) => set('notify', event.target.checked)}
                  />
                  <label htmlFor="notifications">Enable Notifications for this subscription</label>
                </div>
              </div>

              <div className="form-group" id="notify-days-cancellation-group">
                <div className="inline">
                  <div className="split50">
                    <label htmlFor="notify_days_before">Notify me</label>
                    <select
                      name="notify_days_before"
                      id="notify_days_before"
                      value={form.notify_days_before}
                      onChange={(event) => set('notify_days_before', event.target.value)}
                    >
                      <option value="">Default value from settings</option>
                      <option value="0">On due date</option>
                      <option value="1">1 day before</option>
                      {[2, 3, 4, 5, 6, 7, 10, 14, 30].map((days) => (
                        <option key={days} value={days}>
                          {days} days before
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="split50">
                    <label htmlFor="cancellation_date">Cancellation Notification</label>
                    <div className="date-wrapper">
                      <input
                        type="date"
                        name="cancellation_date"
                        id="cancellation_date"
                        value={form.cancellation_date}
                        onChange={(event) => set('cancellation_date', event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <input
              type="text"
              name="url"
              id="url"
              placeholder="URL"
              value={form.url}
              onChange={(event) => set('url', event.target.value)}
            />
          </div>

          <div className="form-group">
            <textarea
              name="notes"
              id="notes"
              placeholder="Notes"
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="inline height50">
              <input
                type="checkbox"
                name="inactive"
                id="inactive"
                className="toggle-switch"
                checked={form.inactive}
                onChange={(event) => set('inactive', event.target.checked)}
              />
              <label htmlFor="inactive">Disable Subscription</label>
            </div>
          </div>

          {form.inactive && replacementOptions.length > 0 && (
            <div className="form-group">
              <label htmlFor="replacement_subscription_id">Replaced with</label>
              <select
                name="replacement_subscription_id"
                id="replacement_subscription_id"
                value={form.replacement_subscription_id ?? ''}
                onChange={(event) =>
                  set(
                    'replacement_subscription_id',
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              >
                <option value="">Nothing</option>
                {replacementOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="buttons">
            <input type="button" value="Cancel" className="secondary-button thin" onClick={onClose} />
            <input type="submit" value={saving ? 'Saving…' : 'Save'} className="thin" disabled={saving} />
          </div>
        </form>
      </section>
    </>
  );
}

function cycleLabel(cycle: number): string {
  switch (cycle) {
    case 1:
      return 'Day(s)';
    case 2:
      return 'Week(s)';
    case 3:
      return 'Month(s)';
    case 4:
      return 'Year(s)';
    default:
      return 'One-time';
  }
}

function initialState(
  subscription: SubscriptionView | null,
  mainCurrency: number | null,
  defaultPaymentMethod: number | null,
  defaultPayer: number | null,
): FormState {
  if (subscription) {
    return {
      name: subscription.name,
      logo: subscription.logo,
      price: String(subscription.price),
      currency_id: subscription.currency_id ?? mainCurrency ?? 0,
      cycle: subscription.cycle,
      frequency: subscription.frequency,
      auto_renew: subscription.auto_renew,
      start_date: subscription.start_date ?? '',
      next_payment: subscription.next_payment ?? '',
      payment_method_id: subscription.payment_method_id,
      payer_user_id: subscription.payer_user_id,
      category_id: subscription.category_id,
      notify: subscription.notify,
      notify_days_before:
        subscription.notify_days_before == null ? '' : String(subscription.notify_days_before),
      cancellation_date: subscription.cancellation_date ?? '',
      url: subscription.url,
      notes: subscription.notes,
      inactive: subscription.inactive,
      replacement_subscription_id: subscription.replacement_subscription_id,
    };
  }

  return {
    name: '',
    logo: null,
    price: '',
    currency_id: mainCurrency ?? 0,
    cycle: 3,
    frequency: 1,
    auto_renew: true,
    start_date: toDateString(new Date()),
    next_payment: '',
    payment_method_id: defaultPaymentMethod,
    payer_user_id: defaultPayer,
    category_id: null,
    notify: false,
    notify_days_before: '',
    cancellation_date: '',
    url: '',
    notes: '',
    inactive: false,
    replacement_subscription_id: null,
  };
}
