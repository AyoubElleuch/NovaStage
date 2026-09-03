"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ChevronRight, ChevronDown } from "lucide-react";
import {
  AWS_SERVICE_REGISTRY,
  AWS_CATEGORIES,
  getServicesByCategory,
  AWSLogoIcon,
} from "./aws-icons";
import type { AWSServiceCategory } from "@/lib/canvas/types";
import type { AWSServiceDef } from "./aws-icons";

interface CanvasServicePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddService: (serviceId: string) => void;
}

export default function CanvasServicePalette({
  isOpen,
  onClose,
  onAddService,
}: CanvasServicePaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["compute", "database", "networking"])
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const categories = Object.entries(AWS_CATEGORIES) as [AWSServiceCategory, { label: string; color: string; bgColor: string }][];

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return Object.values(AWS_SERVICE_REGISTRY).filter(
      (svc) =>
        svc.name.toLowerCase().includes(q) ||
        svc.shortName.toLowerCase().includes(q) ||
        svc.id.toLowerCase().includes(q) ||
        svc.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute left-4 bottom-20 z-40 w-[300px] max-h-[480px] flex flex-col rounded-2xl border border-neutral-200/90 bg-white/95 shadow-2xl backdrop-blur-xl overflow-hidden dark:border-[#283548] dark:bg-[#161d27]/95"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <AWSLogoIcon size={20} />
          <span className="text-[13px] font-bold text-neutral-900 dark:text-white">
            AWS Services
          </span>
        </div>
        <button
          onClick={handleClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-[#1e2634] dark:hover:text-neutral-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-[12px] text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400/30 dark:border-[#283548] dark:bg-[#121721] dark:text-white dark:placeholder-neutral-500 dark:focus:border-[#384961]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Service List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
        {/* Search Results */}
        {filteredServices ? (
          <div className="space-y-1">
            {filteredServices.length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
                No services match &ldquo;{searchQuery}&rdquo;
              </p>
            ) : (
              filteredServices.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  onAdd={() => onAddService(svc.id)}
                />
              ))
            )}
          </div>
        ) : (
          /* Categorized Browse */
          <div className="space-y-0.5">
            {categories.map(([catKey, catMeta]) => {
              const services = getServicesByCategory(catKey);
              const isExpanded = expandedCategories.has(catKey);

              return (
                <div key={catKey}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(catKey)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-[#1e2634]"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-neutral-400" />
                    )}
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: catMeta.color }}
                    />
                    <span className="flex-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      {catMeta.label}
                    </span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {services.length}
                    </span>
                  </button>

                  {/* Service Cards */}
                  {isExpanded && (
                    <div className="ml-4 space-y-0.5 pb-1">
                      {services.map((svc) => (
                        <ServiceCard
                          key={svc.id}
                          service={svc}
                          onAdd={() => onAddService(svc.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCard({
  service,
  onAdd,
}: {
  service: AWSServiceDef;
  onAdd: () => void;
}) {
  const Icon = service.icon;
  const catMeta = AWS_CATEGORIES[service.category];

  return (
    <button
      onClick={onAdd}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-[#1e2634] dark:active:bg-[#283548]"
      title={`Add ${service.name} to canvas`}
    >
      <Icon size={28} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-neutral-900 truncate dark:text-white">
          {service.shortName}
        </div>
        <div className="text-[10px] text-neutral-400 truncate dark:text-neutral-500">
          {service.description}
        </div>
      </div>
      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium text-white"
        style={{ backgroundColor: catMeta.color }}
      >
        {catMeta.label.split(" ")[0]}
      </span>
    </button>
  );
}
