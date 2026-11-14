"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INTRO_DURATION = 1000;
const TRANSITION_INTRO_DURATION = 300;
const EXIT_DURATION = 480;
const TRANSITION_EXIT_DURATION = 220;
const PAGE_READY_CAP_MS = 1200;
const MAX_WAITING_PROGRESS = 92;

let hasShownInitialLoadingScreen = false;

function waitForImage(image: HTMLImageElement) {
  if (image.complete || image.loading === "lazy") return Promise.resolve();

  return new Promise<void>((resolve) => {
    const finish = () => {
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      resolve();
    };
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
}

function waitForPage(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    let settled = false;
    let timeoutId: number | null = null;

    const startAssetChecks = () => {
      const images = Array.from(document.images).map(waitForImage);
      const fonts = "fonts" in document ? [document.fonts.ready.catch(() => undefined)] : [];
      Promise.all([...images, ...fonts]).then(finish);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("load", startAssetChecks);
      resolve();
    };

    timeoutId = window.setTimeout(finish, PAGE_READY_CAP_MS);
    signal.addEventListener("abort", finish, { once: true });

    if (document.readyState === "complete") {
      startAssetChecks();
    } else {
      window.addEventListener("load", startAssetChecks, { once: true });
    }
  });
}

type LoadingScreenProps = { ready?: boolean; onComplete?: () => void };

export default function LoadingScreen(props: LoadingScreenProps = {}) {
  const pathname = usePathname() ?? "";
  const isTransition = Boolean(props.onComplete);
  const [shouldShowInitial] = useState(() => {
    if (isTransition) return true;
    if (hasShownInitialLoadingScreen) return false;
    if (pathname === "/") {
      hasShownInitialLoadingScreen = true;
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (!isTransition) {
      hasShownInitialLoadingScreen = true;
    }
    if (!isTransition && (!shouldShowInitial || pathname !== "/")) {
      document.documentElement.setAttribute("data-loading-state", "complete");
    }
  }, [isTransition, shouldShowInitial, pathname]);

  if (!isTransition && (!shouldShowInitial || pathname !== "/")) return null;
  return <BrandedLoadingScreen {...props} />;
}

function BrandedLoadingScreen({ ready = true, onComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const completeRef = useRef(onComplete);
  const readyRef = useRef(ready);
  const tryRemoveRef = useRef<(() => void) | null>(null);
  const isTransition = Boolean(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (ready) {
      readyRef.current = true;
      tryRemoveRef.current?.();
    }
  }, [ready]);

  useEffect(() => {
    let hasFinished = false;
    let hasPassedIntro = false;
    let isPageReady = false;
    let progressTimer: number | undefined;
    let exitTimer: number | undefined;
    const abortController = new AbortController();

    const introDuration = isTransition ? TRANSITION_INTRO_DURATION : INTRO_DURATION;
    const exitDuration = isTransition ? TRANSITION_EXIT_DURATION : EXIT_DURATION;

    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-loading-state", "loading");
    }

    const tryRemove = () => {
      if (hasFinished || !hasPassedIntro || !isPageReady || !readyRef.current) return;
      hasFinished = true;
      if (progressTimer) window.clearInterval(progressTimer);
      setProgress(100);
      setIsExiting(true);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-loading-state", "exiting");
        window.dispatchEvent(new CustomEvent("novastage:loader-exit"));
      }
      exitTimer = window.setTimeout(() => {
        setIsVisible(false);
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-loading-state", "complete");
          window.dispatchEvent(new CustomEvent("novastage:loader-complete"));
        }
        completeRef.current?.();
      }, exitDuration);
    };

    tryRemoveRef.current = tryRemove;

    const beginWaiting = () => {
      if (hasFinished) return;
      setIsWaiting(true);
      setProgress(14);
      progressTimer = window.setInterval(() => {
        setProgress((currentProgress) => {
          if (currentProgress >= MAX_WAITING_PROGRESS) return currentProgress;
          return Math.min(MAX_WAITING_PROGRESS, currentProgress + 3);
        });
      }, 120);
    };

    const introTimer = window.setTimeout(() => {
      hasPassedIntro = true;
      if (isPageReady && readyRef.current) {
        tryRemove();
      } else {
        beginWaiting();
      }
    }, introDuration);

    void waitForPage(abortController.signal).then(() => {
      isPageReady = true;
      tryRemove();
    });

    return () => {
      tryRemoveRef.current = null;
      abortController.abort();
      window.clearTimeout(introTimer);
      if (progressTimer) window.clearInterval(progressTimer);
      if (exitTimer) window.clearTimeout(exitTimer);
      if (typeof document !== "undefined" && !hasFinished) {
        document.documentElement.setAttribute("data-loading-state", "complete");
      }
    };
  }, [isTransition]);

  useEffect(() => {
    if (isVisible && !isExiting) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isVisible, isExiting]);

  if (!isVisible) return null;

  return (
    <div
      className={`loading-screen ${isExiting ? "loading-screen--exiting pointer-events-none" : ""}`}
      role="status"
      aria-label={isWaiting ? `Loading ${Math.round(progress)} percent` : "Loading NovaStage"}
      aria-live="polite"
    >
      <div className="loading-screen__content">
        <div className="loading-screen__logo-wrap">
          <Image
            className="loading-screen__logo"
            src="/images/logo.svg"
            alt="NovaStage"
            width={171}
            height={70}
            priority
          />
          <span className="loading-screen__sheen" aria-hidden="true" />
        </div>
        <p className="loading-screen__label">Building what&apos;s next</p>
        {isWaiting && (
          <div className="loading-screen__progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
