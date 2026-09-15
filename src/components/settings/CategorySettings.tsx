'use client';

import { useDraftList } from '@/lib/browser-state';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { countSubscriptionsUsing, deleteRow, insertOwned, updateRow } from '@/lib/settings-actions';

export function CategorySettings() {
  const { categories, refresh } = useAppData();
  const [drafts, setDrafts] = useDraftList(categories);

  async function save(id: number) {
    const category = drafts.find((item) => item.id === id);
    if (!category) return;
    try {
      await updateRow('categories', id, { name: category.name });
      showSuccessMessage('Category saved');
      refresh();
    } catch {
      showErrorMessage('Could not save the category');
    }
  }

  async function remove(id: number) {
    const inUse = await countSubscriptionsUsing('category_id', id);
    if (inUse > 0) {
      showErrorMessage('This category is in use and cannot be deleted');
      return;
    }
    try {
      await deleteRow('categories', id);
      showSuccessMessage('Category deleted');
      refresh();
    } catch {
      showErrorMessage('Could not delete the category');
    }
  }

  async function add() {
    try {
      await insertOwned('categories', {
        name: 'New category',
        sort_order: categories.length,
      });
      refresh();
    } catch {
      showErrorMessage('Could not add the category');
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>Categories</h2>
      </header>
      <div id="categories">
        {drafts.map((category, index) => (
          <div className="form-group-inline" data-categoryid={category.id} key={category.id}>
            <input
              type="text"
              autoComplete="off"
              value={category.name}
              onChange={(event) =>
                setDrafts((current) =>
                  current.map((item) =>
                    item.id === category.id ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              placeholder="Category"
            />
            <button className="image-button medium" onClick={() => save(category.id)} title="Save category">
              <i className="fa-solid fa-check" />
            </button>
            {/* "No category" is the fallback every subscription falls back to. */}
            {index === 0 ? (
              <button className="image-button medium disabled" title="The default category cannot be deleted">
                <i className="fa-solid fa-trash-can" />
              </button>
            ) : (
              <button
                className="image-button medium"
                onClick={() => remove(category.id)}
                title="Delete category"
              >
                <i className="fa-solid fa-trash-can" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="buttons">
        <input type="submit" value="Add" id="addCategory" onClick={add} className="thin mobile-grow" />
      </div>
    </section>
  );
}
