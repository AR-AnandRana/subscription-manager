'use client';

import { useDraftList } from '@/lib/browser-state';
import { useAppData } from '../AppDataProvider';
import { showErrorMessage, showSuccessMessage } from '../Toast';
import { countSubscriptionsUsing, deleteRow, insertOwned, updateRow } from '@/lib/settings-actions';

export function HouseholdSettings() {
  const { household, refresh } = useAppData();
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
      showSuccessMessage('Member saved');
      refresh();
    } catch {
      showErrorMessage('Could not save the member');
    }
  }

  async function remove(id: number) {
    // Deleting a member that still pays for something would orphan those
    // subscriptions, so upstream refuses and so do we.
    const inUse = await countSubscriptionsUsing('payer_user_id', id);
    if (inUse > 0) {
      showErrorMessage('This member still pays for subscriptions and cannot be deleted');
      return;
    }
    try {
      await deleteRow('household', id);
      showSuccessMessage('Member deleted');
      refresh();
    } catch {
      showErrorMessage('Could not delete the member');
    }
  }

  async function add() {
    try {
      await insertOwned('household', { name: 'New member', email: '' });
      refresh();
    } catch {
      showErrorMessage('Could not add the member');
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>Household</h2>
      </header>
      <div id="householdMembers">
        {drafts.map((member, index) => (
          <div className="form-group-inline" data-memberid={member.id} key={member.id}>
            <input
              type="text"
              name="member"
              autoComplete="off"
              value={member.name}
              onChange={(event) => edit(member.id, 'name', event.target.value)}
              placeholder="Member"
            />
            {index !== 0 && (
              <input
                type="text"
                name="email"
                autoComplete="off"
                value={member.email}
                onChange={(event) => edit(member.id, 'email', event.target.value)}
                placeholder="Email"
              />
            )}
            <button className="image-button medium" onClick={() => save(member.id)} title="Save member">
              <i className="fa-solid fa-check" />
            </button>
            {index !== 0 ? (
              <button className="image-button medium" onClick={() => remove(member.id)} title="Delete member">
                <i className="fa-solid fa-trash-can" />
              </button>
            ) : (
              <button className="image-button medium disabled" title="The account holder cannot be deleted">
                <i className="fa-solid fa-trash-can" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="buttons">
        <input type="submit" value="Add" id="addMember" onClick={add} className="thin mobile-grow" />
      </div>
      <div className="settings-notes">
        <p>
          <i className="fa-solid fa-circle-info" /> Household members let you record who pays for each
          subscription and split the statistics by person.
        </p>
      </div>
    </section>
  );
}
