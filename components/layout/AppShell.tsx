"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./Sidebar";
import { Skeleton } from "@/components/ui/Skeleton";

// Client-side route guard. TODO(backend): replace with cookie/middleware once real auth exists.
export function AppShell({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="px-4 py-6 lg:ml-[232px] lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
