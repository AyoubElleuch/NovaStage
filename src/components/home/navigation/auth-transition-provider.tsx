"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import LoadingScreen from "@/app/loading-screen";

export default function AuthTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const navigate = (event: Event) => {
      const target = (event as CustomEvent<string>).detail;
      if (target !== "/signup" && target !== "/login") return;
      setError(""); setDestination(target);
    };
    window.addEventListener("novastage:auth-navigation", navigate);
    return () => window.removeEventListener("novastage:auth-navigation", navigate);
  }, []);

  useEffect(() => {
    if (!destination || pathname === destination) return;
    const timeout = window.setTimeout(() => {
      setDestination(null);
      setError("Navigation is taking longer than expected. Please try again.");
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, [destination, pathname]);

  return <>
    <div inert={Boolean(destination)}>{children}</div>
    {destination && <LoadingScreen key={destination} ready={pathname === destination} onComplete={() => setDestination(null)} />}
    {error && <div className="fixed bottom-5 left-1/2 z-[110] w-[min(90%,440px)] -translate-x-1/2 rounded-lg bg-red-950 p-4 text-sm text-white" role="alert">
      {error}<button type="button" className="ml-3 underline" onClick={() => setError("")}>Dismiss</button>
    </div>}
  </>;
}