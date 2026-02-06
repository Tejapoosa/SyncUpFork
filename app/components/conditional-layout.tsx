"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { AppSidebar } from "./app-sidebar";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  // Memoize the showSidebar calculation to prevent unnecessary re-renders
  const showSidebar = useMemo(() =>
    pathname !== "/" && !(pathname.startsWith("/meeting/") && !isSignedIn),
    [pathname, isSignedIn]
  );

  if (!showSidebar) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="sidebar-layout">
        <AppSidebar />
        <main className="sidebar-main overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
