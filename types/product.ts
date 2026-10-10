export type WeatherSensitivity = "hot" | "cold" | "neutral";

/** A sellable product, aligned with the synthetic backend v2 dataset. */
export type Product = {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  brand: string;
  unit: string;
  priceMxn: number;
  baseDailyDemand: number;
  weatherSensitivity: WeatherSensitivity;
  tags: readonly string[];
};
