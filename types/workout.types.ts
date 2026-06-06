export type TrainingLevel = 'beginner' | 'intermediate' | 'professional';

export type DayStatus = 'unfinished' | 'finished' | 'skipped';

// One row in a detailed set prescription (Sets, Reps, RPE, Load).
// null means the value is not prescribed — user fills it in.
export interface SetBlock {
  sets: number;
  reps: number | null;
  rpe: number | null;
  load: number | null;
}

export interface Exercise {
  id: string;
  name: string;
  label?: string;       // "A", "B", "C" — shown for structured plans
  // Simple format (existing plans)
  sets?: number;
  reps?: string;
  // Detailed format (plans imported from txt files)
  setBlocks?: SetBlock[];
  youtubeUrl: string;
  notes?: string;
}

export interface WorkoutDay {
  dayNumber: number;
  weekNumber: number;
  label: string;
  isRestDay: boolean;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  level: TrainingLevel;
  name: string;
  durationWeeks: number;
  description: string;
  days: WorkoutDay[];
  // Default training days of the week (JS Date.getDay() values: 0=Sun … 6=Sat)
  defaultWeeklySchedule: number[];
}

export type PlanMode = 'scheduled' | 'daily';

export interface PlanProgress {
  planId: string;
  startDate: string;
  // How the user chose to track this plan
  mode: PlanMode;
  dayStatus: { [dayNumber: number]: DayStatus };
  // Actual days of the week the user chose to train (JS Date.getDay() values)
  weeklySchedule: number[];
  // Completed set counts: dayNumber → `${exerciseId}-${blockIndex}` → completedSets
  setProgress?: { [dayNumber: number]: { [key: string]: number } };
  // User-edited set blocks: dayNumber → exerciseId → overridden blocks
  customSetBlocks?: { [dayNumber: number]: { [exerciseId: string]: SetBlock[] } };
  // Exercises added by the user per day (from the exercise library)
  customExercises?: { [dayNumber: number]: Exercise[] };
  // scheduled mode: calendar date (YYYY-MM-DD) → plan dayNumber
  dateMap?: { [dateYMD: string]: number };
  // The actual calendar date each plan day was completed (YYYY-MM-DD)
  completionDates?: { [dayNumber: number]: string };
}

export interface CompletedPlanDay {
  dayNumber: number;
  label: string;
  status: DayStatus;
  completionDate?: string; // YYYY-MM-DD
}

export interface CompletedPlan {
  id: string;
  planId: string;
  planName: string;
  level: TrainingLevel;
  startDate: string;      // YYYY-MM-DD
  completedDate: string;  // YYYY-MM-DD — date the last day was marked
  totalDays: number;      // training days only (no rest days)
  finishedDays: number;
  skippedDays: number;
  dayResults: CompletedPlanDay[];
}

export interface WorkoutState {
  selectedLevel: TrainingLevel | null;
  activePlanId: string | null;
  progress: PlanProgress | null;
  planHistory: CompletedPlan[];
}
