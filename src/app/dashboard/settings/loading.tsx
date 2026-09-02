export default function SettingsLoading() {
  return (
    <div className="max-w-3xl space-y-6" role="status" aria-label="Loading settings">
      {/* Header Skeleton */}
      <header>
        <div className="skeleton h-3 w-16" />
        <div className="skeleton mt-2 h-9 w-32" />
        <div className="skeleton mt-2 h-4 w-96 max-w-full" />
      </header>

      {/* Hero Profile Summary Card */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:gap-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27] transition-colors duration-200">
        <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
        <div className="min-w-0 space-y-1.5">
          <div className="skeleton h-4 w-36" />
          <div className="skeleton h-3.5 w-48 max-w-full" />
          <div className="skeleton h-3 w-28" />
        </div>
        <div className="skeleton ml-auto h-6 w-18 rounded-full" />
      </section>

      <div className="space-y-6">
        {/* 1. Appearance & Theme Card */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27] transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div>
              <div className="skeleton h-4 w-36" />
              <div className="skeleton mt-1 h-3 w-72 max-w-full" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Light Mode choice */}
            <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-[#283548] dark:bg-[#121721]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="skeleton h-8 w-8 rounded-lg" />
                  <div>
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton mt-1 h-3 w-12" />
                  </div>
                </div>
                <div className="skeleton h-4 w-4 rounded-full" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-3/4" />
              </div>
            </div>

            {/* Dark Mode choice */}
            <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-[#283548] dark:bg-[#121721]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="skeleton h-8 w-8 rounded-lg" />
                  <div>
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton mt-1 h-3 w-16" />
                  </div>
                </div>
                <div className="skeleton h-4 w-4 rounded-full" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-3/4" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Profile Information Card */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27] transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div>
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-1 h-3 w-64 max-w-full" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="skeleton mb-1.5 h-3.5 w-20" />
              <div className="skeleton h-11 w-full rounded-lg" />
            </div>
            <div>
              <div className="skeleton mb-1.5 h-3.5 w-20" />
              <div className="skeleton h-11 w-full rounded-lg" />
            </div>
            <div className="sm:col-span-2">
              <div className="skeleton mb-1.5 h-3.5 w-24" />
              <div className="skeleton h-11 w-full rounded-lg" />
              <div className="skeleton mt-1.5 h-3 w-52" />
            </div>
            <div className="sm:col-span-2">
              <div className="skeleton mb-1.5 h-3.5 w-28" />
              <div className="skeleton h-11 w-full rounded-lg" />
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-neutral-100 dark:border-[#283548] pt-5">
            <div className="skeleton h-10 w-28 rounded-lg" />
          </div>
        </section>

        {/* 3. Change Password Card */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-[#283548] dark:bg-[#161d27] transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div>
              <div className="skeleton h-4 w-24" />
              <div className="skeleton mt-1 h-3 w-56 max-w-full" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="skeleton mb-1.5 h-3.5 w-24" />
              <div className="skeleton h-11 w-full rounded-lg" />
              {/* Password Strength Skeleton */}
              <div className="mt-2.5 border-t border-neutral-100 dark:border-[#283548] pt-2.5">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-3 w-28" />
                  <div className="skeleton h-3 w-12" />
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton h-1 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="skeleton mb-1.5 h-3.5 w-28" />
              <div className="skeleton h-11 w-full rounded-lg" />
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-neutral-100 dark:border-[#283548] pt-5">
            <div className="skeleton h-10 w-36 rounded-lg" />
          </div>
        </section>

        {/* 4. Danger Zone Card */}
        <section className="rounded-xl border border-red-200 bg-red-50/40 p-5 sm:p-6 dark:border-red-900/40 dark:bg-red-950/20 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div>
              <div className="skeleton h-4 w-28" />
              <div className="skeleton mt-1 h-3 w-72 max-w-full" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-red-100 dark:border-red-900/30 pt-5">
            <div className="skeleton h-3.5 w-96 max-w-full" />
            <div className="skeleton h-10 w-32 rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  );
}