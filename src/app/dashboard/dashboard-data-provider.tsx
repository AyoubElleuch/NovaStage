"use client";

import { SWRConfig } from "swr";
import type {
  DashboardProjectsData,
  DashboardSettingsData,
} from "@/lib/dashboard-data";

interface DashboardDataProviderProps {
  children: React.ReactNode;
  projects: DashboardProjectsData;
  settings: DashboardSettingsData;
}

export default function DashboardDataProvider({
  children,
  projects,
  settings,
}: DashboardDataProviderProps) {
  return (
    <SWRConfig
      value={{
        fallback: {
          "/api/dashboard/projects": projects,
          "/api/dashboard/settings": settings,
        },
        dedupingInterval: 30_000,
        errorRetryCount: 2,
        keepPreviousData: true,
        revalidateOnFocus: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
