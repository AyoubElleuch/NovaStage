"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface HomeDropdownOption<T extends string | number> {
  value: T;
  label: string;
  detail?: string;
  icon?: ReactNode;
}

interface HomeDropdownProps<T extends string | number> {
  value: T;
  options: HomeDropdownOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export default function HomeDropdown<T extends string | number>({ value, options, onChange, label, className = "" }: HomeDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  return <div ref={rootRef} className={`home-dropdown ${className}`}>
    <button type="button" className="home-dropdown-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={label}
      onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)}>
      <span className="home-dropdown-selected">{selected?.icon}{selected?.label}</span><ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && <div className="home-dropdown-menu" role="listbox" aria-label={label}>
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={String(option.value)}
        onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.value); setOpen(false); }}>
        <span className="home-dropdown-option-icon">{option.icon}</span><span className="home-dropdown-option-copy"><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>{option.value === value && <Check size={14} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}