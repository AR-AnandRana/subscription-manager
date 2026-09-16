'use client';

import { useRef, useState } from 'react';
import { useAppData } from '../AppDataProvider';
import { logoSrc } from '../SubscriptionLogo';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { deleteRow, insertOwned, updateRow, uploadPaymentIcon } from '@/lib/settings-actions';

/**
 * Payment methods, from settings.php.
 *
 * Upstream renders them as a grid of pills: clicking one enables or disables it,
 * the name is edited in place, and the little x deletes it. A method in use by a
 * subscription can be neither disabled nor deleted.
 */
export function PaymentMethodSettings() {
  const { paymentMethods, views, t, refresh } = useAppData();
  const inUse = new Set(views.map((subscription) => subscription.payment_method_id));

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function toggle(id: number, enabled: boolean, methodInUse: boolean) {
    if (methodInUse && enabled) {
      showErrorMessage(t('cant_delete_payment_method_in_use'));
      return;
    }
    try {
      await updateRow('payment_methods', id, { enabled: !enabled });
      refresh();
    } catch {
      showErrorMessage(t('failed_update_payment'));
    }
  }

  async function rename(id: number, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      await updateRow('payment_methods', id, { name: trimmed });
      showSuccessMessage(t('payment_renamed'));
      refresh();
    } catch {
      showErrorMessage(t('payment_not_renamed'));
    }
  }

  async function remove(id: number) {
    try {
      await deleteRow('payment_methods', id);
      showSuccessMessage(t('payment_method_removed'));
      refresh();
    } catch {
      showErrorMessage(t('error'));
    }
  }

  async function onIconSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIcon(await uploadPaymentIcon(file));
    } catch {
      showErrorMessage(t('error_saving_logo'));
    }
  }

  async function add() {
    if (!name.trim()) {
      showErrorMessage(t('fill_all_fields'));
      return;
    }
    setAdding(true);
    try {
      await insertOwned('payment_methods', {
        name: name.trim(),
        icon,
        sort_order: paymentMethods.length + 1,
        enabled: true,
      });
      showSuccessMessage(t('payment_method_added_successfuly'));
      setName('');
      setIcon(null);
      if (fileRef.current) fileRef.current.value = '';
      refresh();
    } catch {
      showErrorMessage(t('error'));
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('payment_methods')}</h2>
      </header>

      <div className="payments-list" id="payments-list">
        {paymentMethods.map((method) => {
          const methodInUse = inUse.has(method.id);
          return (
            <div
              className="payments-payment"
              data-enabled={method.enabled ? 1 : 0}
              data-in-use={methodInUse ? 'yes' : 'no'}
              data-paymentid={method.id}
              key={method.id}
              title={
                methodInUse
                  ? t('cant_delete_payment_method_in_use')
                  : method.enabled
                    ? t('disable')
                    : t('enable')
              }
              onClick={() => toggle(method.id, method.enabled, methodInUse)}
            >
              <div className="drag-icon" title="">
                <i className="fa-solid fa-grip-vertical" />
              </div>
              {method.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSrc(method.icon) ?? ''} alt="Logo" />
              )}
              <span
                className="payment-name"
                contentEditable
                suppressContentEditableWarning
                title={t('rename_payment_method')}
                onClick={(event) => event.stopPropagation()}
                onBlur={(event) => rename(method.id, event.currentTarget.textContent ?? '')}
              >
                {method.name}
              </span>
              {!methodInUse && (
                <div
                  className="delete-payment-method"
                  title={t('delete')}
                  data-paymentid={method.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    void remove(method.id);
                  }}
                >
                  x
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="settings-notes">
        <p>
          <i className="fa-solid fa-circle-info" /> {t('payment_methods_info')}
        </p>
        <p>
          <i className="fa-solid fa-circle-info" /> {t('rename_payment_methods_info')}
        </p>
      </div>

      <header>
        <h2 className="second-header">{t('add_custom_payment')}</h2>
      </header>
      <div>
        <form id="payments-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-group-inline">
            <input
              type="text"
              name="paymentname"
              id="paymentname"
              autoComplete="off"
              placeholder={t('payment_method_name')}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <label htmlFor="paymenticon" className="icon-preview">
              {/* Rendered only once an icon exists: an empty src makes the
                  browser re-request the page. */}
              {icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt={t('logo_preview')} id="form-icon" />
              )}
            </label>
            <input
              type="file"
              id="paymenticon"
              name="paymenticon"
              accept="image/jpeg, image/png, image/gif, image/webp"
              onChange={onIconSelected}
              className="hidden-input"
              ref={fileRef}
            />
            <input
              type="button"
              className="button thin"
              id="add-payment-button"
              value="+"
              title={t('add')}
              disabled={adding}
              onClick={add}
            />
          </div>
        </form>
      </div>
    </section>
  );
}
