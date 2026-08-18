"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeftFromLine, ArrowRightFromLine, LayoutGrid, LogOut, UsersRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";

interface AdminSidebarProps {
  userEmail: string | undefined;
  userRole: string;
}

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/waitlist", label: "Waitlist", icon: UsersRound },
];

export default function AdminSidebar({ userEmail, userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`admin-sidebar ${isCollapsed ? "admin-sidebar--collapsed" : ""}`}>
      <div>
        <div className="admin-sidebar__brand">
          <Link href="/admin" aria-label="NovaStage admin overview" className="admin-sidebar__logo">
            <Image src="/images/logo.svg" alt="NovaStage" width={171} height={70} priority />
          </Link>
        </div>

        <nav aria-label="Admin navigation" className="admin-sidebar__nav">
          {navigation.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`admin-sidebar__link ${isActive ? "admin-sidebar__link--active" : ""}`}
                title={isCollapsed ? label : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__account">
          <div className="admin-sidebar__avatar" aria-hidden="true">
            {(userEmail?.[0] || "N").toUpperCase()}
          </div>
          <div className="admin-sidebar__account-copy">
            <strong>{userEmail}</strong>
            <span>{userRole.replace("_", " ")}</span>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="admin-sidebar__signout">
            <LogOut aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </form>
      </div>

      <button
        type="button"
        className="admin-sidebar__collapse"
        onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ArrowRightFromLine aria-hidden="true" /> : <ArrowLeftFromLine aria-hidden="true" />}
      </button>
    </aside>
  );
}