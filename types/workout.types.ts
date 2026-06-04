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

export interface PlanProgress {
  planId: string;
  startDate: string;
  dayStatus: { [dayNumber: number]: DayStatus };
  // Actual days of the week the user chose to train (JS Date.getDay() values)
  weeklySchedule: number[];
  // Completed set counts: dayNumber → `${exerciseId}-${blockIndex}` → completedSets
  setProgress?: { [dayNumber: number]: { [key: string]: number } };
}

export interface WorkoutState {
  selectedLevel: TrainingLevel | null;
  activePlanId: string | null;
  progress: PlanProgress | null;
}
