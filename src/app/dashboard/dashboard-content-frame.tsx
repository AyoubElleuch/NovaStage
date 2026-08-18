"use client";

import { usePathname } from "next/navigation";

export default function DashboardContentFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isProjectCanvas = pathname?.startsWith("/dashboard/projects/");

  if (isProjectCanvas) {
    return (
      <main className="relative min-w-0 flex-1 h-dvh overflow-hidden bg-[#f7f6f2]">
        {children}
      </main>
    );
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-12">
        {children}
      </div>
    </main>
  );
}
