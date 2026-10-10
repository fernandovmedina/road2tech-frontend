import {
  CalendarHeart,
  FerrisWheel,
  Goal,
  type LucideIcon,
  type LucideProps,
  MicVocal,
  PartyPopper,
} from "lucide-react";
import type { DemandEventType } from "@/types/demandEvent";

const EVENT_TYPE_ICONS: Record<DemandEventType, LucideIcon> = {
  football_match: Goal,
  concert: MicVocal,
  fair: FerrisWheel,
  festival: PartyPopper,
  holiday: CalendarHeart,
};

type EventTypeIconProps = LucideProps & { type: DemandEventType };

export function EventTypeIcon({ type, ...props }: EventTypeIconProps) {
  const Icon = EVENT_TYPE_ICONS[type];
  return <Icon aria-hidden {...props} />;
}
