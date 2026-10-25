import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ProjectCanvasLoading() {
  return <div className="relative h-full w-full overflow-hidden bg-[#faf8f5] dark:bg-[#10151f]" style={{ backgroundImage: "radial-gradient(circle,rgba(140,150,160,.16) 1px,transparent 1px)", backgroundSize: "24px 24px" }}>
    <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
      <Link href="/dashboard" aria-label="Back to projects" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-[#283548] dark:bg-[#161d27]"><ArrowLeft className="h-4 w-4" /></Link>
      <div aria-hidden="true" className="h-11 w-44 max-w-[60%] animate-pulse rounded-xl bg-neutral-200/70 motion-reduce:animate-none dark:bg-[#1e2634]" />
    </div>
    <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 pb-20 pt-28">
      <div aria-hidden="true" className="flex w-full max-w-xl flex-col items-center gap-4 opacity-60 sm:flex-row">
        {[0, 1].map(index => <div key={index} className="w-full max-w-64 animate-pulse space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 motion-reduce:animate-none dark:border-[#283548] dark:bg-[#161d27]"><div className="h-3 w-16 rounded bg-neutral-200 dark:bg-[#283548]" /><div className="h-4 w-4/5 rounded bg-neutral-100 dark:bg-[#1e2634]" /><div className="h-2 w-full rounded bg-neutral-100 dark:bg-[#1e2634]" /></div>)}
      </div>
      <p className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading your canvas…</p>
    </div>
  </div>;
}
