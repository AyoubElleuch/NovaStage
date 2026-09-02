"use client";

import React, { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";

interface MobileNavContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
  close: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [isOpen, setIsOpen] = useState(false);

  // Automatically close mobile nav on route change during render
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  return (
    <MobileNavContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggle: () => setIsOpen((prev) => !prev),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
