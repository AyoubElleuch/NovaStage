"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  indicator?: ReactNode;
  disabled?: boolean;
}

const DropdownBoundaryContext = createContext<HTMLElement | null>(null);

export function DropdownBoundary({ container, children }: { container: HTMLElement | null; children: ReactNode }) {
  return <DropdownBoundaryContext.Provider value={container}>{children}</DropdownBoundaryContext.Provider>;
}

/** A select-only combobox. The portal keeps menus clear of palette/inspector clipping. */
export default function Dropdown({ id, value, options, onChange, disabled = false, "aria-label": label, className = "" }: {
  id?: string;
  value: string;
  options: readonly DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const boundary = useContext(DropdownBoundaryContext);
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });
  const selected = options.find(option => option.value === value);
  const expanded = open && !disabled;
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
  const close = () => setOpen(false);
  const show = () => {
    if (disabled || !enabled.length) return;
    const index = options.findIndex(option => option.value === value && !option.disabled);
    setActive(index < 0 ? enabled[0] : index);
    setOpen(true);
  };
  useEffect(() => {
    if (!expanded) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const bounds = boundary?.getBoundingClientRect();
      const topLimit = bounds ? bounds.top + 8 : 8;
      const bottomLimit = bounds ? bounds.bottom - 8 : window.innerHeight - 8;
      const leftLimit = bounds ? bounds.left + 8 : 8;
      const rightLimit = bounds ? bounds.right - 8 : window.innerWidth - 8;
      const below = Math.max(0, bottomLimit - rect.bottom - 4);
      const above = Math.max(0, rect.top - topLimit - 4);
      const maxHeight = Math.min(280, Math.max(below, above));
      const top = below >= Math.min(280, above) ? rect.bottom + 4 : Math.max(topLimit, rect.top - maxHeight - 4);
      setPosition({ left: Math.max(leftLimit, Math.min(rect.left, rightLimit - rect.width)) - (bounds?.left || 0),
        top: top - (bounds?.top || 0), width: Math.min(rect.width, rightLimit - leftLimit), maxHeight });
    };
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) close();
    };
    place();
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [expanded, boundary]);
  useEffect(() => { if (expanded) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: "nearest" }); }, [active, expanded, listId]);
  return <>
    <button ref={trigger} id={id} type="button" role="combobox" aria-label={label} aria-haspopup="listbox"
      aria-expanded={expanded} aria-controls={expanded ? listId : undefined} aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
      disabled={disabled} onClick={() => expanded ? close() : show()} onBlur={() => close()}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); close(); }
        else if (event.key === "Tab") close();
        else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (expanded) { if (!options[active]?.disabled) onChange(options[active].value); close(); } else show();
        } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          if (!expanded) show();
          else {
            const index = enabled.indexOf(active);
            setActive(event.key === "Home" ? enabled[0] : event.key === "End" ? enabled[enabled.length - 1]
              : enabled[(index + (event.key === "ArrowDown" ? 1 : enabled.length - 1)) % enabled.length]);
          }
        }
      }}
      className={`flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-xs text-neutral-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#283548] dark:bg-[#161d27] dark:text-white ${className}`}>
      {selected?.indicator}<span className="min-w-0 flex-1 truncate">{selected?.label || "Choose an option"}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
    </button>
    {expanded && createPortal(<div ref={menu} id={listId} role="listbox" aria-label={label} data-canvas-ui
      style={{ position: boundary ? "absolute" : "fixed", ...position, zIndex: 1100 }}
      onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }}
      className="overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-white p-1 shadow-xl dark:border-[#283548] dark:bg-[#161d27]">
      {options.map((option, index) => <div id={`${listId}-${index}`} key={option.value} role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined}
        onMouseEnter={() => { if (!option.disabled) setActive(index); }}
        onClick={event => { event.stopPropagation(); if (!option.disabled) { onChange(option.value); close(); trigger.current?.focus(); } }}
        className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs ${option.disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${active === index ? "bg-emerald-50 text-emerald-800 dark:bg-[#1e2634] dark:text-emerald-300" : "text-neutral-700 dark:text-neutral-300"}`}>
        {option.indicator}<span className="min-w-0 flex-1 truncate">{option.label}</span>{option.value === value && <Check className="h-3.5 w-3.5 text-emerald-500" />}
      </div>)}
    </div>, boundary || document.body)}
  </>;
}
