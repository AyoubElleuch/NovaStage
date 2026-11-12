"use client";

import { usePathname } from "next/navigation";

export default function EmbedChromeBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return /^\/share\/[^/]+\/embed\/?$/.test(pathname) ? null : children;
}
