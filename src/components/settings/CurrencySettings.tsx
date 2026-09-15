'use client';

import { useDraftList } from '@/lib/browser-state';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import {
  countSubscriptionsUsing,
  deleteRow,
  insertOwned,
  updateProfile,
  updateRow,
} from '@/lib/settings-actions';

export function CurrencySettings() {
  const { currencies, profile, refresh } = useAppData();
  const [drafts, setDrafts] = useDraftList(currencies);

  async function save(id: number) {
    const currency = drafts.find((item) => item.id === id);
    if (!currency) return;
    try {
      await updateRow('currencies', id, {
        name: currency.name,
        symbol: currency.symbol,
        code: currency.code,
        rate: Number(currency.rate) || 1,
      });
      showSuccessMessage('Currency saved');
      refresh();
    } catch {
      showErrorMessage('Could not save the currency');
    }
  }

  async function remove(id: number) {
    if (id === profile.main_currency) {
      showErrorMessage('The main currency cannot be deleted');
      return;
    }
    const inUse = await countSubscriptionsUsing('currency_id', id);
    if (inUse > 0) {
      showErrorMessage('This currency is in use and cannot be deleted');
      return;
    }
    try {
      await deleteRow('currencies', id);
      showSuccessMessage('Currency deleted');
      refresh();
    } catch {
      showErrorMessage('Could not delete the currency');
    }
  }

  async function add() {
    try {
      await insertOwned('currencies', { name: 'New currency', symbol: '', code: 'USD', rate: 1 });
      refresh();
    } catch {
      showErrorMessage('Could not add the currency');
    }
  }

  async function setMainCurrency(id: number) {
    try {
      await updateProfile({ main_currency: id });
      showSuccessMessage('Main currency updated');
      refresh();
    } catch {
      showErrorMessage('Could not set the main currency');
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>Currencies</h2>
      </header>

      <div className="form-group-inline">
        <label htmlFor="main_currency">Main currency</label>
        <select
          id="main_currency"
          value={profile.main_currency ?? ''}
          onChange={(event) => setMainCurrency(Number(event.target.value))}
        >
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.name} ({currency.code})
            </option>
          ))}
        </select>
      </div>

      <div id="currencies">
        {drafts.map((currency) => (
          <div className="form-group-inline" data-currencyid={currency.id} key={currency.id}>
            <input
              type="text"
              autoComplete="off"
              value={currency.name}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.id === currency.id ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              placeholder="Name"
            />
            <input
              type="text"
              autoComplete="off"
              value={currency.symbol}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.id === currency.id ? { ...item, symbol: event.target.value } : item,
                  ),
                )
              }
              placeholder="Symbol"
            />
            <input
              type="text"
              autoComplete="off"
              value={currency.code}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.id === currency.id ? { ...item, code: event.target.value.toUpperCase() } : item,
                  ),
                )
              }
              placeholder="Code"
            />
            <input
              type="number"
              step="0.0001"
              autoComplete="off"
              value={String(currency.rate)}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.id === currency.id ? { ...item, rate: Number(event.target.value) } : item,
                  ),
                )
              }
              placeholder="Rate"
            />
            <button className="image-button medium" onClick={() => save(currency.id)} title="Save currency">
              <i className="fa-solid fa-check" />
            </button>
            {currency.id === profile.main_currency ? (
              <button className="image-button medium disabled" title="The main currency cannot be deleted">
                <i className="fa-solid fa-trash-can" />
              </button>
            ) : (
              <button
                className="image-button medium"
                onClick={() => remove(currency.id)}
                title="Delete currency"
              >
                <i className="fa-solid fa-trash-can" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="buttons">
        <input type="submit" value="Add" id="addCurrency" onClick={add} className="thin mobile-grow" />
      </div>
      <div className="settings-notes">
        <p>
          <i className="fa-solid fa-circle-info" /> Rates are expressed relative to your main currency: a
          price is divided by its currency&apos;s rate to convert it. A rate of 1 leaves the price
          unchanged.
        </p>
      </div>
    </section>
  );
}
