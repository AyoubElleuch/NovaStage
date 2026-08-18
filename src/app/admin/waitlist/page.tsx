import { getWaitlistEntries } from "../actions";
import WaitlistTable from "./waitlist-table";

export default async function AdminWaitlistPage() {
  const { data: waitlist = [], error } = await getWaitlistEntries();

  return (
    <div className="admin-page">
      <header className="admin-page__header admin-page__header--compact">
        <div>
          <h1 className="admin-page__title">Waitlist</h1>
          <p className="admin-page__description">Review registrations and manage account access.</p>
        </div>
      </header>

      {error ? (
        <div className="admin-alert admin-alert--error">
          <p>Failed to load waitlist entries</p>
          <span>{error}</span>
        </div>
      ) : (
        <WaitlistTable initialData={waitlist} />
      )}
    </div>
  );
}
