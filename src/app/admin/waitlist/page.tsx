import { redirect } from "next/navigation";
import { getWaitlistEntries } from "../actions";
import WaitlistTable from "./waitlist-table";
import { AlertCircle } from "lucide-react";

/**
 * Waitlist page has been deactivated in Beta v1.0.0 per task specification:
 * "Keep the files, just deactivate them. We don't want the waitlist page anymore or the waitlist form."
 */
export default async function AdminWaitlistPage() {
  redirect("/admin");

  // Deactivated code preserved below:
  const { data: waitlist = [], error } = await getWaitlistEntries();

  return (
    <div className="space-y-8">
      <header className="dash-enter">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Administration (Deactivated)
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">Waitlist</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Review registrations and manage account access.
        </p>
      </header>

      {error ? (
        <div className="dash-enter flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Failed to load waitlist entries</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      ) : (
        <WaitlistTable initialData={waitlist} />
      )}
    </div>
  );
}

