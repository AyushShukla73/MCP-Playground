"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  FolderOpen,
  CheckSquare,
  ClipboardCheck,
  BarChart3,
  Terminal,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Workspaces", href: "/workspaces", icon: FolderKanban },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Approvals", href: "/approvals", icon: ClipboardCheck },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "MCP Playground", href: "/playground", icon: Terminal },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card transition-all">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Terminal className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">MCP Control Room</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <Link href="/settings">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              asChild
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}