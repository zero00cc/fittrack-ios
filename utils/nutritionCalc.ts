import { CalorieGoals } from '../types/calorie.types';

export const USER_PROFILE_KEY = 'fittrack_user_profile';

export interface UserProfile {
  sex:                'male' | 'female';
  age:                number;
  weightKg:           number;
  heightCm:           number;
  activityLevel:      'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
  goal:               'lose' | 'maintain' | 'build' | 'gain';
  onboardingComplete: boolean;
}

export const ACTIVITY_OPTIONS: { id: UserProfile['activityLevel']; label: string; desc: string; multiplier: number }[] = [
  { id: 'sedentary', label: 'Sedentary',        desc: 'Desk job, little or no exercise',    multiplier: 1.2   },
  { id: 'light',     label: 'Lightly Active',    desc: 'Light exercise 1–3 days/week',       multiplier: 1.375 },
  { id: 'moderate',  label: 'Moderately Active', desc: 'Moderate exercise 3–5 days/week',    multiplier: 1.55  },
  { id: 'very',      label: 'Very Active',       desc: 'Hard exercise 6–7 days/week',        multiplier: 1.725 },
  { id: 'extra',     label: 'Extra Active',      desc: 'Very hard exercise + physical job',  multiplier: 1.9   },
];

export const GOAL_OPTIONS: { id: UserProfile['goal']; label: string; desc: string; adj: number; emoji: string }[] = [
  { id: 'lose',     label: 'Lose Weight',  desc: '−500 kcal/day · ~0.5 kg/week loss',   adj: -500, emoji: '📉' },
  { id: 'maintain', label: 'Maintain',     desc: 'Eat at your TDEE',                    adj: 0,    emoji: '⚖️' },
  { id: 'build',    label: 'Build Muscle', desc: '+250 kcal/day · lean bulk',            adj: 250,  emoji: '💪' },
  { id: 'gain',     label: 'Gain Weight',  desc: '+500 kcal/day · ~0.5 kg/week gain',   adj: 500,  emoji: '📈' },
];

/**
 * Mifflin-St Jeor BMR (1990) × Ainsworth activity multiplier,
 * adjusted for goal. Protein per ISSN 2017 guidelines.
 */
export function calcPlan(profile: Omit<UserProfile, 'onboardingComplete'>): CalorieGoals {
  const { sex, age, weightKg, heightCm, activityLevel, goal } = profile;

  const bmr  = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const mult = ACTIVITY_OPTIONS.find((a) => a.id === activityLevel)?.multiplier ?? 1.55;
  const adj  = GOAL_OPTIONS.find((g) => g.id === goal)?.adj ?? 0;

  const calories = Math.max(1200, Math.round(bmr * mult + adj));
  const protein  = Math.round(({ lose: 2.2, maintain: 1.6, build: 2.0, gain: 2.0 } as const)[goal] * weightKg);
  const fat      = Math.round((calories * ({ lose: 0.25, maintain: 0.25, build: 0.28, gain: 0.30 } as const)[goal]) / 9);
  const carbs    = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat };
}
