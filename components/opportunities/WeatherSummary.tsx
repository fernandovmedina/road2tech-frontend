import { Cloud, CloudLightning, CloudRain, CloudSun, type LucideIcon, Sun } from "lucide-react";
import { WEATHER_LABELS } from "@/lib/opportunities/labels";
import type { WeatherCondition, WeatherForecast } from "@/types/demandEvent";

const WEATHER_ICONS: Record<WeatherCondition, LucideIcon> = {
  clear: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  storm: CloudLightning,
};

export function WeatherSummary({ weather }: { weather: WeatherForecast }) {
  const Icon = WEATHER_ICONS[weather.condition];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-ink-secondary" aria-hidden />
      <span>
        {WEATHER_LABELS[weather.condition]} · {weather.temperatureC}°C ·{" "}
        {weather.precipitationChancePct}% rain
      </span>
    </span>
  );
}
