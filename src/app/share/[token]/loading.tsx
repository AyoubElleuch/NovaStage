import { Loader2 } from "lucide-react";

export default function SharedCanvasLoading() {
  return <main role="status" className="grid h-dvh place-items-center bg-[#faf8f5] px-6 dark:bg-[#10151f]"><p className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading shared canvas…</p></main>;
}
