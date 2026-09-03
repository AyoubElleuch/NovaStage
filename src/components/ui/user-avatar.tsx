"use client";

import React, { useState } from "react";

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  alt?: string;
}

const SIZE_MAP = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-xs font-semibold",
  lg: "h-12 w-12 text-base font-semibold",
  xl: "h-16 w-16 text-xl font-bold",
};

export default function UserAvatar({
  src,
  name,
  email,
  size = "md",
  className = "",
  alt,
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmedSrc = src?.trim() || null;

  const displayName = name?.trim() || email?.trim() || "User";
  const initial = (displayName[0] || "U").toUpperCase();
  const sizeClasses = typeof size === "string" ? SIZE_MAP[size] || SIZE_MAP.md : "";
  const customDimensions =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, Math.floor(size * 0.4))}px` }
      : undefined;

  const showImage = Boolean(trimmedSrc && failedSrc !== trimmedSrc);

  return (
    <div
      style={customDimensions}
      className={`relative inline-grid shrink-0 select-none place-items-center overflow-hidden rounded-full bg-neutral-900 text-white dark:bg-emerald-600 ${sizeClasses} ${className}`}
    >
      {showImage ? (
        // Standard img tag with no-referrer handles external domains (GitHub, Unsplash, Dicebear, Google, etc.) cleanly
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmedSrc!}
          alt={alt || displayName}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(trimmedSrc)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="font-semibold uppercase leading-none">
          {initial}
        </span>
      )}
    </div>
  );
}
