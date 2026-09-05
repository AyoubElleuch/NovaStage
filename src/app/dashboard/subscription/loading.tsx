export default function SubscriptionLoading() {
  return (
    <div className="space-y-10 pb-16" role="status" aria-label="Loading subscription details">
      {/* Header Skeleton */}
      <header className="max-w-3xl">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-2 h-9 w-64" />
        <div className="skeleton mt-2 h-4 w-96 max-w-full" />
      </header>

      {/* Plan Status Banner Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27]">
        <div className="flex items-center gap-3.5">
          <div className="skeleton h-12 w-12 rounded-xl" />
          <div className="space-y-1.5">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="skeleton h-8 w-28 rounded-lg" />
      </div>

      {/* Toggle Skeleton */}
      <div className="flex items-center justify-center gap-3">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-6 w-11 rounded-full" />
        <div className="skeleton h-4 w-24" />
      </div>

      {/* Cards Skeleton */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 md:pt-0 xl:grid-cols-4 scrollbar-none">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-[82vw] sm:w-[320px] shrink-0 snap-center md:w-auto md:shrink flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 dark:border-[#283548] dark:bg-[#161d27]"
          >
            <div>
              <div className="skeleton h-5 w-20" />
              <div className="skeleton mt-2 h-3 w-40" />
              <div className="skeleton mt-5 h-8 w-24" />
              <div className="mt-6 space-y-3">
                <div className="skeleton h-3.5 w-full" />
                <div className="skeleton h-3.5 w-5/6" />
                <div className="skeleton h-3.5 w-4/6" />
                <div className="skeleton h-3.5 w-full" />
              </div>
            </div>
            <div className="mt-8 pt-4">
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
