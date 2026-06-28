"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Euro,
  Settings,
  Dumbbell,
  FileText,
  LogOut,
  ChevronRight,
  Swords,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Übersicht",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Mitglieder",
    href: "/members",
    icon: Users,
  },
  {
    title: "Buchhaltung",
    href: "/accounting",
    icon: Euro,
    children: [
      { title: "Dashboard", href: "/accounting" },
      { title: "Rechnungen", href: "/accounting/invoices" },
    ],
  },
  {
    title: "Einstellungen",
    href: "/settings",
    icon: Settings,
    children: [
      { title: "Sportarten", href: "/settings/sports" },
      { title: "Felder", href: "/settings/fields" },
      { title: "Vereinsdaten", href: "/settings/club" },
    ],
  },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary shrink-0">
          <Swords className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-sidebar-foreground font-bold text-base leading-tight block">
            BoxClub
          </span>
          <span className="text-sidebar-foreground/50 text-xs">Verwaltung</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const hasChildren = item.children && item.children.length > 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  {hasChildren && (
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  )}
                </Link>

                {hasChildren && isActive && (
                  <ul className="ml-7 mt-1 space-y-1">
                    {item.children!.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className={cn(
                            "flex items-center px-3 py-1.5 rounded-md text-xs transition-colors",
                            pathname === child.href
                              ? "text-sidebar-foreground font-medium"
                              : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                          )}
                        >
                          {child.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User / Logout */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-medium truncate">
              {userName}
            </p>
            <p className="text-sidebar-foreground/40 text-xs">Admin</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  );
}
