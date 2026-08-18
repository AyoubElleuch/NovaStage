import { getWaitlistEntries } from "./actions";
import Link from "next/link";
import { ArrowUpRight, Check, Clock3, UsersRound, X } from "lucide-react";

export default async function AdminOverviewPage() {
  const { data: waitlist = [] } = await getWaitlistEntries();

  const total = waitlist.length;
  const pending = waitlist.filter((w) => w.status === "pending").length;
  const approved = waitlist.filter((w) => w.status === "approved").length;
  const disapproved = waitlist.filter((w) => w.status === "disapproved").length;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Good morning, admin.</h1>
          <p className="admin-page__description">A clear view of access requests across NovaStage.</p>
        </div>
        <Link
          href="/admin/waitlist"
          className="admin-button admin-button--dark"
        >
          <span>Review waitlist</span>
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </header>

      <div className="admin-statline" aria-label="Waitlist summary">
        <div className="admin-statline__item">
          <UsersRound aria-hidden="true" />
          <span>Total registrations</span>
          <strong>{total}</strong>
        </div>
        <div className="admin-statline__item">
          <Clock3 aria-hidden="true" />
          <span>Needs review</span>
          <strong>{pending}</strong>
        </div>
        <div className="admin-statline__item">
          <Check aria-hidden="true" />
          <span>Approved</span>
          <strong>{approved}</strong>
        </div>
        <div className="admin-statline__item">
          <X aria-hidden="true" />
          <span>Disapproved</span>
          <strong>{disapproved}</strong>
        </div>
      </div>

      <section className="admin-panel admin-panel--activity">
        <div className="admin-panel__header">
          <div>
            <p className="admin-kicker">Latest activity</p>
            <h2>Recent registrations</h2>
          </div>
          <Link href="/admin/waitlist" className="admin-text-link">View all <ArrowUpRight aria-hidden="true" /></Link>
        </div>
        <div className="admin-activity-list">
          {waitlist.length === 0 ? (
            <div className="admin-empty-state">
              No registrations recorded yet.
            </div>
          ) : (
            waitlist.slice(0, 5).map((entry) => (
              <div key={entry.email} className="admin-activity-row">
                <div className="admin-activity-row__identity">
                  <div className="admin-sidebar__avatar" aria-hidden="true">
                    {entry.email.slice(0, 2)}
                  </div>
                  <div>
                    <p>{entry.email}</p>
                    <span>Via {entry.provider}</span>
                  </div>
                </div>
                <div className="admin-activity-row__meta">
                  <span className={`admin-status admin-status--${entry.status}`}>
                    <i aria-hidden="true" />
                    {entry.status}
                  </span>
                  <time>
                    {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "—"}
                  </time>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
