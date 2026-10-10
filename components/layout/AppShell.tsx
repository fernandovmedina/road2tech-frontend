"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { copy } from "@/lib/copy";
import { Sidebar } from "./Sidebar";
import { Skeleton } from "@/components/ui/Skeleton";

// Client-side route guard. A 401 from the API clears the session (lib/auth-context), which lands here and redirects.
// TODO(backend): replace with cookie/middleware once real auth exists.
export function AppShell({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <div role="status" aria-label={copy.shell.sessionLoading} className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only rounded-control bg-card px-4 py-2 text-sm font-bold text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        {copy.shell.skipToContent}
      </a>
      <Sidebar />
      <main id="main-content" className="px-4 py-6 lg:ml-[232px] lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
