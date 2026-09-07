"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthTransitionLink({ href, children, className }: { href: "/login" | "/signup"; children: ReactNode; className?: string }) {
  return <Link href={href} className={className} onNavigate={() => {
    window.dispatchEvent(new CustomEvent("novastage:auth-navigation", { detail: href }));
  }}>{children}</Link>;
}