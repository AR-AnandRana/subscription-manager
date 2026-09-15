'use client';

import { useDraftList } from '@/lib/browser-state';
import { useAppData } from '../AppDataProvider';
import { logoSrc } from '../SubscriptionLogo';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { countSubscriptionsUsing, deleteRow, insertOwned, updateRow } from '@/lib/settings-actions';

export function PaymentMethodSettings() {
  const { paymentMethods, refresh } = useAppData();
  const [drafts, setDrafts] = useDraftList(paymentMethods);

  async function rename(id: number) {
    const method = drafts.find((item) => item.id === id);
    if (!method) return;
    try {
      await updateRow('payment_methods', id, { name: method.name });
      showSuccessMessage('Payment method saved');
      refresh();
    } catch {
      showErrorMessage('Could not save the payment method');
    }
  }

  async function toggleEnabled(id: number, enabled: boolean) {
    try {
      await updateRow('payment_methods', id, { enabled });
      refresh();
    } catch {
      showErrorMessage('Could not update the payment method');
    }
  }

  async function remove(id: number) {
    const inUse = await countSubscriptionsUsing('payment_method_id', id);
    if (inUse > 0) {
      showErrorMessage('This payment method is in use and cannot be deleted');
      return;
    }
    try {
      await deleteRow('payment_methods', id);
      showSuccessMessage('Payment method deleted');
      refresh();
    } catch {
      showErrorMessage('Could not delete the payment method');
    }
  }

  async function add() {
    try {
      await insertOwned('payment_methods', {
        name: 'New payment method',
        icon: null,
        sort_order: paymentMethods.length + 1,
        enabled: true,
      });
      refresh();
    } catch {
      showErrorMessage('Could not add the payment method');
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>Payment Methods</h2>
      </header>

      <div id="paymentMethods">
        {drafts.map((method) => (
          <div className="form-group-inline" data-paymentid={method.id} key={method.id}>
            {method.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc(method.icon) ?? ''} alt="" className="payment-method-icon" width={32} />
            )}
            <input
              type="text"
              autoComplete="off"
              value={method.name}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.id === method.id ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              placeholder="Payment method name"
            />
            <button className="image-button medium" onClick={() => rename(method.id)} title="Save">
              <i className="fa-solid fa-check" />
            </button>
            <button
              className="image-button medium"
              onClick={() => toggleEnabled(method.id, !method.enabled)}
              title={method.enabled ? 'Disable' : 'Enable'}
            >
              <i className={`fa-solid ${method.enabled ? 'fa-eye' : 'fa-eye-slash'}`} />
            </button>
            <button className="image-button medium" onClick={() => remove(method.id)} title="Delete">
              <i className="fa-solid fa-trash-can" />
            </button>
          </div>
        ))}
      </div>

      <div className="buttons">
        <input type="submit" value="Add" id="addPaymentMethod" onClick={add} className="thin mobile-grow" />
      </div>
      <div className="settings-notes">
        <p>
          <i className="fa-solid fa-circle-info" /> Disabled payment methods stay on the subscriptions
          already using them but no longer appear when you add a new one.
        </p>
      </div>
    </section>
  );
}
