export interface MacroEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  timestamp: string;  // ISO
  name: string;
  imageUri?: string;  // local file path
  calories: number;
  protein: number;    // grams
  carbs: number;      // grams
  fat: number;        // grams
}

export interface DailyLog {
  date: string;
  entries: MacroEntry[];
}

export interface CalorieHistory {
  [date: string]: DailyLog;
}

export interface CalorieGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
