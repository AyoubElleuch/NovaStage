"use client";

import React, { useState, useMemo, useRef, useEffect, useId } from "react";
import { Search, X, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { AWS_SERVICE_REGISTRY, AWS_CATEGORIES, AWSLogoIcon } from "./aws-icons";
import type { AWSServiceCategory } from "@/lib/canvas/types";
import type { AWSServiceDef } from "./aws-icons";

interface CanvasServicePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddService: (serviceId: string) => void;
}

const POPULAR_SERVICE_IDS = ["lambda", "apigateway", "s3", "ec2", "rds", "vpc"];
const SEARCH_ALIASES: Record<string, string> = {
  lambda: "serverless function functions handler",
  ec2: "virtual machine vm instance instances server",
  s3: "bucket object storage files assets",
  apigateway: "api rest http endpoint serverless",
  dynamodb: "nosql serverless key value database",
  rds: "relational sql postgres postgresql mysql database",
  vpc: "virtual private cloud network networking",
  sqs: "queue messaging asynchronous async",
  sns: "pub sub notifications messaging events",
};
const SERVICES = Object.values(AWS_SERVICE_REGISTRY);
const CATEGORIES = (Object.entries(AWS_CATEGORIES) as [AWSServiceCategory, { label: string; color: string; bgColor: string }][])
  .sort((a, b) => a[1].label.localeCompare(b[1].label));
const SERVICES_BY_CATEGORY = new Map(CATEGORIES.map(([category]) => [category, SERVICES.filter((service) => service.category === category)]));

function searchText(service: AWSServiceDef) {
  return `${service.name} ${service.shortName} ${service.id} ${service.description} ${AWS_CATEGORIES[service.category]?.label ?? ""} ${SEARCH_ALIASES[service.id] ?? ""}`.toLowerCase();
}

export default function CanvasServicePalette({ isOpen, onClose, onAddService }: CanvasServicePaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["compute", "database", "networking"]));
  const [lastAdded, setLastAdded] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const paletteId = useId();

  useEffect(() => {
    if (isOpen) searchInputRef.current?.focus();
  }, [isOpen]);

  const handleClose = () => {
    setSearchQuery("");
    setCategoryFilter("");
    setLastAdded("");
    onClose();
  };

  const filteredServices = useMemo(() => {
    const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length && !categoryFilter) return null;
    return SERVICES.filter((service) =>
      (!categoryFilter || service.category === categoryFilter) && tokens.every((token) => searchText(service).includes(token))
    ).sort((a, b) => {
      const query = searchQuery.trim().toLowerCase();
      const aExact = a.id === query || a.shortName.toLowerCase() === query;
      const bExact = b.id === query || b.shortName.toLowerCase() === query;
      return Number(bExact) - Number(aExact) || a.shortName.localeCompare(b.shortName);
    });
  }, [searchQuery, categoryFilter]);

  const addService = (service: AWSServiceDef) => {
    onAddService(service.id);
    setLastAdded(`${service.shortName} added to canvas`);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby={`${paletteId}-title`}
      className="absolute left-4 bottom-20 z-40 flex max-h-[min(560px,70vh)] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-[#283548] dark:bg-[#161d27]/95"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          handleClose();
        }
      }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <AWSLogoIcon size={22} />
          <h2 id={`${paletteId}-title`} className="text-sm font-bold text-neutral-900 dark:text-white">AWS services</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-[#1e2634] dark:text-neutral-400">{SERVICES.length}</span>
        </div>
        <button type="button" aria-label="Close service palette" onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-[#1e2634]">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="px-4 pb-3 text-xs text-neutral-500 dark:text-neutral-400">Choose a service to place it on your canvas.</p>
      <div className="space-y-2 px-3 pb-3">
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            ref={searchInputRef}
            type="search"
            aria-label="Search AWS services"
            placeholder="Search by service, use case, or category"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredServices?.length) {
                e.preventDefault();
                addService(filteredServices[0]);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                listRef.current?.querySelector<HTMLButtonElement>("[data-service-card]")?.focus();
              }
            }}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-9 text-xs text-neutral-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-[#283548] dark:bg-[#121721] dark:text-white"
          />
          {searchQuery && <button type="button" aria-label="Clear service search" onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }} className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 dark:hover:bg-[#283548]"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <select aria-label="Filter AWS services by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 outline-none focus:border-emerald-500 dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-300">
          <option value="">All categories</option>
          {CATEGORIES.filter(([key]) => SERVICES_BY_CATEGORY.get(key)?.length).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 scrollbar-thin" onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        const cards = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-service-card]") ?? []);
        const index = cards.indexOf(e.target as HTMLButtonElement);
        if (index < 0) return;
        e.preventDefault();
        if (index === 0 && e.key === "ArrowUp") searchInputRef.current?.focus();
        else cards[Math.max(0, Math.min(cards.length - 1, index + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
      }}>
        {filteredServices ? (
          <div className="space-y-1">
            <p role="status" className="px-2 pb-1 text-[11px] text-neutral-500 dark:text-neutral-400">{filteredServices.length} {filteredServices.length === 1 ? "service" : "services"} found</p>
            {!filteredServices.length ? <div className="px-3 py-6 text-center"><p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">No matching services</p><p className="mt-1 text-xs text-neutral-500">Try a shorter name or another category.</p><button type="button" onClick={() => { setSearchQuery(""); setCategoryFilter(""); searchInputRef.current?.focus(); }} className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">Clear filters</button></div> : filteredServices.map((service) => <ServiceCard key={service.id} service={service} onAdd={() => addService(service)} />)}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="mb-3">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Popular services</p>
              {POPULAR_SERVICE_IDS.map((id) => AWS_SERVICE_REGISTRY[id]).filter(Boolean).map((service) => <ServiceCard key={service.id} service={service} onAdd={() => addService(service)} />)}
            </div>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Browse categories</p>
            {CATEGORIES.map(([key, meta]) => {
              const services = SERVICES_BY_CATEGORY.get(key) ?? [];
              if (!services.length) return null;
              const expanded = expandedCategories.has(key);
              return <div key={key}>
                <button type="button" aria-expanded={expanded} aria-controls={`${paletteId}-${key}`} onClick={() => toggleCategory(key)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:hover:bg-[#1e2634]">
                  {expanded ? <ChevronDown className="h-3 w-3 text-neutral-400" /> : <ChevronRight className="h-3 w-3 text-neutral-400" />}
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span className="flex-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">{meta.label}</span>
                  <span className="text-[10px] text-neutral-500">{services.length}</span>
                </button>
                {expanded && <div id={`${paletteId}-${key}`} className="ml-3 space-y-0.5 pb-2">{services.map((service) => <ServiceCard key={service.id} service={service} onAdd={() => addService(service)} />)}</div>}
              </div>;
            })}
          </div>
        )}
      </div>
      <div className="border-t border-neutral-200 px-4 py-2 text-[10px] text-neutral-500 dark:border-[#283548] dark:text-neutral-400">
        <span role="status" aria-live="polite">{lastAdded || "Enter adds the first search result · Esc closes"}</span>
      </div>
    </div>
  );
}

function ServiceCard({ service, onAdd }: { service: AWSServiceDef; onAdd: () => void }) {
  const Icon = service.icon;
  const category = AWS_CATEGORIES[service.category];
  return (
    <button type="button" data-service-card="true" onClick={onAdd} aria-label={`Add ${service.name} to canvas`} className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-500 active:bg-neutral-200 dark:hover:bg-[#1e2634] dark:focus-visible:bg-[#1e2634] dark:active:bg-[#283548]" title={`${service.name} — ${service.description}`}>
      <Icon size={32} className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-neutral-900 dark:text-white">{service.shortName}</div>
        <div className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400">{service.description}</div>
      </div>
      <span className="max-w-20 shrink-0 truncate rounded px-1.5 py-0.5 text-[9px] font-medium text-neutral-700 dark:text-neutral-200" style={{ backgroundColor: `${category.color}20` }} title={category.label}>{category.label}</span>
      <Plus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
    </button>
  );
}
