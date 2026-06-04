export interface FoodItem {
  id: string;
  name: string;
  caloriesPer100g: number;
  category: 'protein' | 'carb' | 'fat' | 'vegetable' | 'fruit' | 'dairy' | 'other';
}

export interface MealEntry {
  id: string;
  foodId: string;
  foodName: string;
  weightGrams: number;
  calories: number;
  timestamp: string;
}

export interface DailyLog {
  date: string;
  entries: MealEntry[];
  totalCalories: number;
}

export interface CalorieHistory {
  [date: string]: DailyLog;
}

export interface CalorieSettings {
  dailyTarget: number;
}
