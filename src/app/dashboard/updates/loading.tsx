export default function UpdatesLoading() {
  return (
    <div className="mx-auto max-w-3xl" role="status" aria-label="Loading updates">
      {/* Header Skeleton */}
      <header className="border-b border-neutral-200 dark:border-[#283548] pb-8">
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-4 rounded-sm" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton mt-3 h-9 w-32" />
        <div className="skeleton mt-2 h-4 w-96 max-w-xl" />
      </header>

      {/* Timeline Skeleton */}
      <div className="relative py-3 before:absolute before:bottom-8 before:left-1.75 before:top-8 before:w-px before:bg-neutral-200 dark:before:bg-[#283548]">
        {/* Release 1: Latest */}
        <article className="relative grid grid-cols-[16px_1fr] gap-5 py-7">
          <span
            className="relative z-10 mt-1 h-3.75 w-3.75 rounded-full border-4 border-white bg-neutral-900 dark:border-[#0f141c] dark:bg-emerald-500"
            aria-hidden="true"
          />
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="skeleton h-3.5 w-14" />
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-4 w-12 rounded-full" />
            </div>
            <div className="skeleton mt-3 h-6 w-56 max-w-full" />
            <div className="skeleton mt-1.5 h-4 w-full max-w-lg" />
            <div className="mt-4 space-y-2">
              <div className="flex gap-2.5">
                <div className="skeleton mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm" />
                <div className="skeleton h-4 w-4/5 max-w-md" />
              </div>
            </div>
          </div>
        </article>

        {/* Release 2 */}
        <article className="relative grid grid-cols-[16px_1fr] gap-5 py-7">
          <span
            className="relative z-10 mt-1 h-3.75 w-3.75 rounded-full border-4 border-white bg-neutral-300 dark:border-[#0f141c] dark:bg-neutral-600"
            aria-hidden="true"
          />
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="skeleton h-3.5 w-14" />
              <div className="skeleton h-3 w-28" />
            </div>
            <div className="skeleton mt-3 h-6 w-64 max-w-full" />
            <div className="skeleton mt-1.5 h-4 w-full max-w-lg" />
            <div className="mt-4 space-y-2">
              {[1, 2, 3, 4].map((bullet) => (
                <div key={bullet} className="flex gap-2.5">
                  <div className="skeleton mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm" />
                  <div
                    className={`skeleton h-4 ${
                      bullet === 1 ? "w-3/4 max-w-md" : bullet === 2 ? "w-4/5 max-w-lg" : bullet === 3 ? "w-2/3 max-w-sm" : "w-1/2 max-w-xs"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Release 3 */}
        <article className="relative grid grid-cols-[16px_1fr] gap-5 py-7">
          <span
            className="relative z-10 mt-1 h-3.75 w-3.75 rounded-full border-4 border-white bg-neutral-300 dark:border-[#0f141c] dark:bg-neutral-600"
            aria-hidden="true"
          />
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="skeleton h-3.5 w-14" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton mt-3 h-6 w-44 max-w-full" />
            <div className="skeleton mt-1.5 h-4 w-full max-w-lg" />
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((bullet) => (
                <div key={bullet} className="flex gap-2.5">
                  <div className="skeleton mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm" />
                  <div className="skeleton h-4 w-3/4 max-w-md" />
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
