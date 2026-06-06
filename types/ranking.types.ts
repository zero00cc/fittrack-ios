export type Gender = 'male' | 'female';

export interface LiftingProfile {
  userId:      string;
  displayName: string;
  gender:      Gender;
  bodyMass:    number;    // kg
  squat:       number;    // kg PR
  bench:       number;    // kg PR
  deadlift:    number;    // kg PR
  total:       number;    // squat + bench + deadlift
  weightClass: string;    // e.g. "83kg" or "84kg+"
  updatedAt:   string;
}

// IPF weight classes
const MALE_BOUNDS   = [59, 66, 74, 83, 93, 105, 120] as const;
const FEMALE_BOUNDS = [47, 52, 57, 63, 69, 76, 84]   as const;

export const MALE_CLASSES   = [...MALE_BOUNDS.map((b) => `${b}kg`),   '120kg+'] as string[];
export const FEMALE_CLASSES = [...FEMALE_BOUNDS.map((b) => `${b}kg`), '84kg+']  as string[];

export function getWeightClass(bodyMass: number, gender: Gender): string {
  const bounds = gender === 'male' ? MALE_BOUNDS : FEMALE_BOUNDS;
  const max    = gender === 'male' ? '120kg+' : '84kg+';
  for (const b of bounds) {
    if (bodyMass <= b) return `${b}kg`;
  }
  return max;
}

export function classesForGender(gender: Gender): string[] {
  return gender === 'male' ? MALE_CLASSES : FEMALE_CLASSES;
}
