import { getAdminSubscriptionUsers } from "../actions";
import SubscriptionsTable from "./subscriptions-table";
import { AlertCircle, CreditCard } from "lucide-react";

export default async function AdminSubscriptionsPage() {
  const { data: users = [], error } = await getAdminSubscriptionUsers();

  return (
    <div className="space-y-8">
      <header className="dash-enter">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Super Admin
        </p>
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              Subscription Management
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Manage user tier assignments and provisional pricing plan access.
            </p>
          </div>
        </div>
      </header>

      {error ? (
        <div className="dash-enter flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">
              Failed to load subscription users
            </p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      ) : (
        <SubscriptionsTable initialData={users} />
      )}
    </div>
  );
}
