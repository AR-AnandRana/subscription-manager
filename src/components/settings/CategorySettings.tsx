'use client';

import { useAppData } from '../AppDataProvider';
import { useDraftList } from '@/lib/browser-state';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { countSubscriptionsUsing, deleteRow, insertOwned, updateRow } from '@/lib/settings-actions';

/**
 * Categories, from settings.php.
 *
 * The default category is not listed: upstream skips id 1 ("No category"), the
 * fallback every subscription without a category falls back to. Here that is the
 * first category in sort order, which is what the sign-up seed creates.
 */
export function CategorySettings() {
  const { categories, t, refresh } = useAppData();
  const [drafts, setDrafts] = useDraftList(categories);

  const editable = drafts.slice(1);

  async function save(id: number) {
    const category = drafts.find((item) => item.id === id);
    if (!category) return;
    try {
      await updateRow('categories', id, { name: category.name });
      showSuccessMessage(t('category_saved'));
      refresh();
    } catch {
      showErrorMessage(t('failed_edit_category'));
    }
  }

  async function remove(id: number) {
    const inUse = await countSubscriptionsUsing('category_id', id);
    if (inUse > 0) {
      showErrorMessage(t('category_in_use'));
      return;
    }
    try {
      await deleteRow('categories', id);
      showSuccessMessage(t('category_removed'));
      refresh();
    } catch {
      showErrorMessage(t('failed_remove_category'));
    }
  }

  async function add() {
    try {
      await insertOwned('categories', { name: t('category'), sort_order: categories.length });
      refresh();
    } catch {
      showErrorMessage(t('failed_add_category'));
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('categories')}</h2>
      </header>
      <div className="account-categories">
        <div id="categories" className="sortable-list">
          {editable.map((category) => (
            <div className="form-group-inline" data-categoryid={category.id} key={category.id}>
              <div className="drag-icon">
                <i className="fa-solid fa-grip-vertical" />
              </div>
              <input
                type="text"
                name="category"
                autoComplete="off"
                value={category.name}
                placeholder="Category"
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((item) =>
                      item.id === category.id ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
              <button
                className="image-button medium"
                onClick={() => save(category.id)}
                name="save"
                title={t('save_category')}
              >
                <i className="fa-solid fa-check" />
              </button>
              <button
                className="image-button medium"
                onClick={() => remove(category.id)}
                title={t('delete_category')}
              >
                <i className="fa-solid fa-trash-can" />
              </button>
            </div>
          ))}
        </div>
        <div className="buttons">
          <input
            type="submit"
            value={t('add')}
            id="addCategory"
            onClick={add}
            className="thin mobile-grow"
          />
        </div>
      </div>
    </section>
  );
}
