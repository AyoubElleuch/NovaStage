export default function DashboardLoading() {
  return (
    <div className="space-y-10" role="status" aria-label="Loading projects">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-9 w-36" />
          <div className="skeleton h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2.5">
          <div className="skeleton h-10 w-32 rounded-lg" />
          <div className="skeleton h-10 w-36 rounded-lg" />
        </div>
      </div>

      <div>
        <div className="mb-4 flex justify-between">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-3 w-16" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {["one", "two", "three"].map((key) => (
            <div key={key} className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex justify-between">
                <div className="skeleton h-9 w-9 rounded-lg" />
                <div className="skeleton h-4 w-4 rounded-full" />
              </div>
              <div className="mt-5 space-y-2">
                <div className="skeleton h-4 w-36" />
                <div className="skeleton h-3 w-48 max-w-full" />
              </div>
              <div className="mt-6 flex justify-between border-t border-neutral-100 pt-3.5">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
