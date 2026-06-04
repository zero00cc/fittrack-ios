import { FoodItem, MealEntry, DailyLog } from '../types/calorie.types';

export function calcEntryCalories(food: FoodItem, grams: number): number {
  return Math.round((grams / 100) * food.caloriesPer100g);
}

export function calcDayTotal(log: DailyLog): number {
  return log.entries.reduce((sum, e) => sum + e.calories, 0);
}

export type CalorieStatus = 'above' | 'normal' | 'below';

export function getCalorieStatus(total: number, target: number): CalorieStatus {
  if (total > target * 1.1) return 'above';
  if (total < target * 0.9) return 'below';
  return 'normal';
}

export function statusColor(status: CalorieStatus): string {
  switch (status) {
    case 'above': return '#ef4444';
    case 'normal': return '#22c55e';
    case 'below': return '#3b82f6';
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildMealEntry(food: FoodItem, grams: number): MealEntry {
  return {
    id: generateId(),
    foodId: food.id,
    foodName: food.name,
    weightGrams: grams,
    calories: calcEntryCalories(food, grams),
    timestamp: new Date().toISOString(),
  };
}
