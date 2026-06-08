import { DailyLog } from '../types/calorie.types';
import { ACCENT, DIM, ACCENT_DARK } from '../constants/theme';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function dayTotals(log: DailyLog | undefined) {
  if (!log) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  return log.entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein,
      carbs:    acc.carbs    + e.carbs,
      fat:      acc.fat      + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// Light-theme palette: lighter gold = more room, darker = over goal
export function calorieColor(total: number, target: number): string {
  if (total > target * 1.1) return ACCENT_DARK;  // P900 #60481C — over
  if (total >= target * 0.9) return ACCENT;       // P700 #886918 — on track
  return DIM;                                      // P600 #AD8D1A — under
}
