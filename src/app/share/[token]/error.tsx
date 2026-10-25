"use client";

export default function ShareError({ reset }: { reset: () => void }) {
  return <main className="grid min-h-dvh place-items-center px-6 text-center"><div>
    <h1 className="text-xl font-semibold">The canvas could not be loaded</h1>
    <p className="mt-3 text-sm text-neutral-500">Please check your connection and try again.</p>
    <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white">Try again</button>
  </div></main>;
}
