export default function ProjectsLoading() {
  return (
    <div className="space-y-10" role="status" aria-label="Loading projects">
      {/* Header Skeleton */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="skeleton h-3 w-18" />
          <div className="skeleton mt-2 h-9 w-32" />
          <div className="skeleton mt-2 h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <div className="skeleton h-10 w-32 flex-1 sm:flex-initial rounded-lg" />
          <div className="skeleton h-10 w-36 flex-1 sm:flex-initial rounded-lg" />
        </div>
      </header>

      {/* Project List Section Skeleton */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-3 w-16" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <div
              key={key}
              className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 dark:border-[#283548] dark:bg-[#161d27] transition-colors duration-200"
            >
              {/* Top row: icon + role badge + menu */}
              <div className="flex items-start justify-between gap-3">
                <div className="skeleton h-9 w-9 rounded-lg" />
                <div className="flex items-center gap-1.5">
                  <div className="skeleton h-5 w-18 rounded-full" />
                  <div className="skeleton h-7 w-7 rounded-lg" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="skeleton mt-4 h-4.5 w-36" />
              <div className="mt-1 space-y-1.5 min-h-[40px] pt-1">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-4/5" />
              </div>

              {/* Invite Code Box Skeleton */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-2.5 py-2 border border-neutral-100 dark:bg-[#121721] dark:border-[#283548]">
                <div className="skeleton h-3.5 w-24" />
                <div className="skeleton h-3.5 w-12" />
              </div>

              {/* Bottom footer: members + timestamp */}
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 dark:border-[#283548] pt-3">
                <div className="flex items-center gap-1.5">
                  <div className="skeleton h-3.5 w-3.5 rounded-sm" />
                  <div className="skeleton h-3 w-20" />
                </div>
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
