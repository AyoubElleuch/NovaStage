"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const INTRO_DURATION = 1000;
const EXIT_DURATION = 480;
const MAX_WAITING_PROGRESS = 92;

function waitForImage(image: HTMLImageElement) {
  if (image.complete) return Promise.resolve();

  return new Promise<void>((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}

function waitForVideo(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();

  return new Promise<void>((resolve) => {
    video.addEventListener("canplay", () => resolve(), { once: true });
    video.addEventListener("error", () => resolve(), { once: true });
  });
}

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let hasFinished = false;
    let hasPassedIntro = false;
    let isPageReady = false;
    let progressTimer: number | undefined;
    let exitTimer: number | undefined;

    const removeScreen = () => {
      if (hasFinished) return;
      hasFinished = true;
      if (progressTimer) window.clearInterval(progressTimer);
      if (readyTimer) window.clearTimeout(readyTimer);
      setProgress(100);
      setIsExiting(true);
      exitTimer = window.setTimeout(() => setIsVisible(false), EXIT_DURATION);
    };

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

    const markPageReady = () => {
      isPageReady = true;
      if (hasPassedIntro) removeScreen();
    };

    const waitForPage = async () => {
      const windowLoaded =
        document.readyState === "complete"
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              window.addEventListener("load", () => resolve(), { once: true });
            });
      const fontsLoaded = document.fonts?.ready ?? Promise.resolve();
      const imagesLoaded = Array.from(document.images).map(waitForImage);
      const videosLoaded = Array.from(document.querySelectorAll("video")).map(waitForVideo);

      await Promise.all([windowLoaded, fontsLoaded, ...imagesLoaded, ...videosLoaded]);
      markPageReady();
    };

    const introTimer = window.setTimeout(() => {
      hasPassedIntro = true;
      if (isPageReady) {
        removeScreen();
      } else {
        beginWaiting();
      }
    }, INTRO_DURATION);

    const readyTimer = window.setTimeout(() => {
      if (!isPageReady) markPageReady();
    }, 30000);

    void waitForPage();

    return () => {
      window.clearTimeout(introTimer);
      if (readyTimer) window.clearTimeout(readyTimer);
      if (progressTimer) window.clearInterval(progressTimer);
      if (exitTimer) window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={`loading-screen ${isExiting ? "loading-screen--exiting" : ""}`}
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
