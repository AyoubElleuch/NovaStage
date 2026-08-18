import { getWaitlistEntries } from "../actions";
import WaitlistTable from "./waitlist-table";
import { AlertCircle } from "lucide-react";

export default async function AdminWaitlistPage() {
  const { data: waitlist = [], error } = await getWaitlistEntries();

  return (
    <div className="space-y-8">
      <header className="dash-enter">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">Waitlist</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Review registrations and manage account access.
        </p>
      </header>

      {error ? (
        <div className="dash-enter flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Failed to load waitlist entries</p>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
        </div>
      ) : (
        <WaitlistTable initialData={waitlist} />
      )}
    </div>
  );
}
