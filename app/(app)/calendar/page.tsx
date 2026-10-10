import { Suspense } from "react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Skeleton } from "@/components/ui/Skeleton";

export const instant = false;

export default function CalendarPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <CalendarView />
    </Suspense>
  );
}
