'use client';

import { useAppData } from '../AppDataProvider';
import { useDraftList } from '@/lib/browser-state';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { countSubscriptionsUsing, deleteRow, insertOwned, updateRow } from '@/lib/settings-actions';

/**
 * Household members, from settings.php.
 *
 * The first member is the account holder: they have no separate email field and
 * cannot be deleted, matching upstream's treatment of index 0.
 */
export function HouseholdSettings() {
  const { household, t, refresh } = useAppData();
  const [drafts, setDrafts] = useDraftList(household);

  function edit(id: number, field: 'name' | 'email', value: string) {
    setDrafts((current) =>
      current.map((member) => (member.id === id ? { ...member, [field]: value } : member)),
    );
  }

  async function save(id: number) {
    const member = drafts.find((item) => item.id === id);
    if (!member) return;
    try {
      await updateRow('household', id, { name: member.name, email: member.email });
      showSuccessMessage(t('member_saved'));
      refresh();
    } catch {
      showErrorMessage(t('failed_edit_household'));
    }
  }

  async function remove(id: number) {
    const inUse = await countSubscriptionsUsing('payer_user_id', id);
    if (inUse > 0) {
      showErrorMessage(t('household_in_use'));
      return;
    }
    try {
      await deleteRow('household', id);
      showSuccessMessage(t('member_removed'));
      refresh();
    } catch {
      showErrorMessage(t('failed_remove_household'));
    }
  }

  async function add() {
    try {
      await insertOwned('household', { name: t('member'), email: '' });
      refresh();
    } catch {
      showErrorMessage(t('failed_add_household'));
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>{t('household')}</h2>
      </header>
      <div className="account-members">
        <div id="householdMembers">
          {drafts.map((member, index) => (
            <div className="form-group-inline" data-memberid={member.id} key={member.id}>
              <input
                type="text"
                name="member"
                autoComplete="off"
                value={member.name}
                placeholder="Member"
                onChange={(event) => edit(member.id, 'name', event.target.value)}
              />
              {index !== 0 && (
                <input
                  type="text"
                  name="email"
                  autoComplete="off"
                  value={member.email}
                  placeholder={t('email')}
                  onChange={(event) => edit(member.id, 'email', event.target.value)}
                />
              )}
              <button
                className="image-button medium"
                onClick={() => save(member.id)}
                name="save"
                title={t('save_member')}
              >
                <i className="fa-solid fa-check" />
              </button>
              {index !== 0 ? (
                <button
                  className="image-button medium"
                  onClick={() => remove(member.id)}
                  title={t('delete_member')}
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              ) : (
                <button className="image-button medium disabled" title={t('cant_delete_member')}>
                  <i className="fa-solid fa-trash-can" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="buttons">
          <input
            type="submit"
            value={t('add')}
            id="addMember"
            onClick={add}
            className="thin mobile-grow"
          />
        </div>
        <div className="settings-notes">
          <p>
            <i className="fa-solid fa-circle-info" /> {t('household_info')}
          </p>
        </div>
      </div>
    </section>
  );
}
