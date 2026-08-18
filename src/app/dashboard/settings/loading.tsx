export default function SettingsLoading() {
  return (
    <div className="max-w-3xl space-y-6" role="status" aria-label="Loading settings">
      <div className="space-y-3">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-9 w-32" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-44 max-w-full" />
          <div className="skeleton h-3 w-28" />
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>

      {["profile", "password"].map((key) => (
        <div key={key} className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-3 w-56 max-w-full" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {["field-one", "field-two", "field-three", "field-four"].map((field) => (
              <div key={field} className="space-y-1.5">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end border-t border-neutral-100 pt-5">
            <div className="skeleton h-10 w-32 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}