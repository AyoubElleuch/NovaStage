"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import LoadingScreen from "@/app/loading-screen";

type TransitionState = {
  destination: string;
  fromPathname: string;
};

export default function AuthTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [transition, setTransition] = useState<TransitionState | null>(null);

  useEffect(() => {
    const navigate = (event: Event) => {
      const target = (event as CustomEvent<string>).detail;
      if (target !== "/signup" && target !== "/login") return;
      const currentPathname = typeof window !== "undefined" ? window.location.pathname : "";
      if (currentPathname === target) return;
      setTransition({ destination: target, fromPathname: currentPathname });
    };
    window.addEventListener("novastage:auth-navigation", navigate);
    return () => window.removeEventListener("novastage:auth-navigation", navigate);
  }, []);

  const hasNavigated = Boolean(
    transition && (pathname === transition.destination || pathname !== transition.fromPathname)
  );
  const redirectedAwayFromAuth = Boolean(
    transition &&
      pathname !== transition.fromPathname &&
      pathname !== "/login" &&
      pathname !== "/signup"
  );

  useEffect(() => {
    if (!transition) return;
    if (redirectedAwayFromAuth) {
      const clearTimer = window.setTimeout(() => setTransition(null), 0);
      return () => window.clearTimeout(clearTimer);
    }
    if (hasNavigated) return;
    const timeout = window.setTimeout(() => {
      setTransition(null);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [transition, hasNavigated, redirectedAwayFromAuth]);

  const handleComplete = useCallback(() => {
    setTransition(null);
  }, []);

  return (
    <>
      {children}
      {transition && !redirectedAwayFromAuth && (
        <LoadingScreen
          key={`${transition.fromPathname}->${transition.destination}`}
          ready={hasNavigated}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}