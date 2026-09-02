export default function UpdatesLoading() {
  return (
    <div className="mx-auto max-w-3xl" role="status" aria-label="Loading updates">
      {/* Header Skeleton */}
      <div className="border-b border-neutral-200 pb-8 space-y-3">
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-4 rounded-sm" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton h-9 w-36" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>

      {/* Timeline Skeleton */}
      <div className="relative py-3 before:absolute before:bottom-8 before:left-1.75 before:top-8 before:w-px before:bg-neutral-200">
        {["latest", "second", "third"].map((key, index) => (
          <article
            key={key}
            className="relative grid grid-cols-[16px_1fr] gap-5 py-7"
          >
            {/* Timeline dot */}
            <span
              className={`relative z-10 mt-1 h-3.75 w-3.75 rounded-full border-4 border-white ${
                index === 0 ? "bg-neutral-400" : "bg-neutral-300"
              }`}
              aria-hidden="true"
            />

            {/* Content placeholder */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="skeleton h-4 w-14" />
                <div className="skeleton h-3 w-28" />
                {index === 0 && <div className="skeleton h-4 w-12 rounded-full" />}
              </div>

              <div className="skeleton h-6 w-56 max-w-full" />
              <div className="skeleton h-4 w-full max-w-lg" />

              {/* Bullet points placeholder */}
              <div className="mt-4 space-y-2.5 pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="skeleton h-3.5 w-3.5 shrink-0 rounded-full" />
                  <div className="skeleton h-3.5 w-3/4 max-w-md" />
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="skeleton h-3.5 w-3.5 shrink-0 rounded-full" />
                  <div className="skeleton h-3.5 w-2/3 max-w-sm" />
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="skeleton h-3.5 w-3.5 shrink-0 rounded-full" />
                  <div className="skeleton h-3.5 w-4/5 max-w-lg" />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
