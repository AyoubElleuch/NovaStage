export default function AdminLoading() {
  return (
    <div className="space-y-10" role="status" aria-label="Loading admin dashboard">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2.5">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-9 w-64 max-w-full" />
          <div className="skeleton h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2.5">
          <div className="skeleton h-10 w-36 rounded-lg" />
          <div className="skeleton h-10 w-36 rounded-lg" />
        </div>
      </header>

      {/* 4 Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-xs transition-colors duration-200 dark:border-[#283548] dark:bg-[#161d27]"
          >
            <div className="space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-8 w-16" />
            </div>
            <div className="skeleton h-11 w-11 rounded-xl" />
          </div>
        ))}
      </section>

      {/* Table Section */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs transition-colors duration-200 dark:border-[#283548] dark:bg-[#161d27]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4 dark:border-[#283548]">
          <div className="space-y-1.5">
            <div className="skeleton h-4 w-36" />
            <div className="skeleton h-3 w-56" />
          </div>
          <div className="skeleton h-9 w-48 rounded-lg" />
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between rounded-lg p-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="skeleton h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton h-2.5 w-44" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-6 w-20 rounded-full" />
                <div className="skeleton h-8 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
