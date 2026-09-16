'use client';

import { useAppData } from '../AppDataProvider';
import { useDraftList } from '@/lib/browser-state';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { countSubscriptionsUsing, deleteRow, insertOwned, updateRow } from '@/lib/settings-actions';

/**
 * Currencies, from settings.php: symbol, name and code per row.
 *
 * The code is locked on a currency that cannot be deleted — the main one, or one
 * a subscription still uses — because changing it would silently reprice those
 * subscriptions.
 */
export function CurrencySettings() {
  const { currencies, profile, lastExchangeUpdate, t, refresh } = useAppData();
  const [drafts, setDrafts] = useDraftList(currencies);

  async function save(id: number) {
    const currency = drafts.find((item) => item.id === id);
    if (!currency) return;
    try {
      await updateRow('currencies', id, {
        name: currency.name,
        symbol: currency.symbol,
        code: currency.code,
      });
      showSuccessMessage(`${currency.name} ${t('currency_saved')}`);
      refresh();
    } catch {
      showErrorMessage(t('failed_to_store_currency'));
    }
  }

  async function remove(id: number) {
    try {
      await deleteRow('currencies', id);
      showSuccessMessage(t('currency_removed'));
      refresh();
    } catch {
      showErrorMessage(t('failed_to_remove_currency'));
    }
  }

  async function add() {
    try {
      await insertOwned('currencies', { name: 'Currency', symbol: '$', code: 'USD', rate: 1 });
      refresh();
    } catch {
      showErrorMessage(t('error_adding_currency'));
    }
  }

  function edit(id: number, field: 'name' | 'symbol' | 'code', value: string) {
    setDrafts((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('currencies')}</h2>
      </header>
      <div className="account-currencies">
        <div id="currencies">
          {drafts.map((currency) => (
            <CurrencyRow
              key={currency.id}
              currency={currency}
              isMain={currency.id === profile.main_currency}
              onEdit={edit}
              onSave={save}
              onRemove={remove}
            />
          ))}
        </div>
        <div className="buttons">
          <input
            type="submit"
            value={t('add')}
            id="addCurrency"
            onClick={add}
            className="thin mobile-grow"
          />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> {t('exchange_update')}{' '}
            <span>{lastExchangeUpdate ?? '—'}</span>
          </p>
          <p>
            <i className="fa-solid fa-circle-info" /> {t('currency_info')}{' '}
            <span>
              fixer.io
              <a href="https://fixer.io/symbols" target="_blank" title="Currency codes" rel="noreferrer">
                <i className="fa-solid fa-arrow-up-right-from-square" />
              </a>
            </span>
          </p>
          <p>{t('currency_performance')}</p>
        </div>
      </div>
    </section>
  );
}

function CurrencyRow({
  currency,
  isMain,
  onEdit,
  onSave,
  onRemove,
}: {
  currency: { id: number; name: string; symbol: string; code: string };
  isMain: boolean;
  onEdit: (id: number, field: 'name' | 'symbol' | 'code', value: string) => void;
  onSave: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const { t } = useAppData();

  async function tryRemove() {
    if (isMain) {
      showErrorMessage(t('currency_is_main'));
      return;
    }
    const inUse = await countSubscriptionsUsing('currency_id', currency.id);
    if (inUse > 0) {
      showErrorMessage(t('currency_in_use'));
      return;
    }
    onRemove(currency.id);
  }

  return (
    <div className="form-group-inline" data-currencyid={currency.id}>
      <input
        type="text"
        className="short"
        name="symbol"
        autoComplete="off"
        value={currency.symbol}
        placeholder="$"
        onChange={(event) => onEdit(currency.id, 'symbol', event.target.value)}
      />
      <input
        type="text"
        name="currency"
        autoComplete="off"
        value={currency.name}
        placeholder="Currency Name"
        onChange={(event) => onEdit(currency.id, 'name', event.target.value)}
      />
      <input
        type="text"
        name="code"
        autoComplete="off"
        value={currency.code}
        placeholder="Currency Code"
        disabled={isMain}
        onChange={(event) => onEdit(currency.id, 'code', event.target.value.toUpperCase())}
      />
      <button
        className="image-button medium"
        onClick={() => onSave(currency.id)}
        name="save"
        title={t('save_currency')}
      >
        <i className="fa-solid fa-check" />
      </button>
      {isMain ? (
        <button className="image-button medium disabled" title={t('cant_delete_main_currency')}>
          <i className="fa-solid fa-trash-can" />
        </button>
      ) : (
        <button className="image-button medium" onClick={tryRemove} title={t('delete_currency')}>
          <i className="fa-solid fa-trash-can" />
        </button>
      )}
    </div>
  );
}
