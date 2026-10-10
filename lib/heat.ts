// Heat gradient (low → high): #FFF3BF → #FFD43B → #FF922B → #E8590C → #A61E1E
export const HEAT_STOPS = ["#FFF3BF", "#FFD43B", "#FF922B", "#E8590C", "#A61E1E"];

export function heatColor(movement: number): string {
  const idx = Math.min(HEAT_STOPS.length - 1, Math.floor((Math.max(0, Math.min(100, movement)) / 100) * HEAT_STOPS.length));
  return HEAT_STOPS[idx];
}
