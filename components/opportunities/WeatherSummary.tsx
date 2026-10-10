import { Cloud, CloudLightning, CloudRain, CloudSun, type LucideIcon, Sun } from "lucide-react";
import { copy } from "@/lib/copy";
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
      <Icon className="size-4 shrink-0 text-muted" aria-hidden />
      <span>
        {WEATHER_LABELS[weather.condition]} · {weather.temperatureC}°C ·{" "}
        {copy.opportunities.weather.rain(weather.precipitationChancePct)}
      </span>
    </span>
  );
}
