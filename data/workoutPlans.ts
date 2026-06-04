import { WorkoutPlan, WorkoutDay, Exercise } from '../types/workout.types';

function metaEx(
  id: string,
  label: string,
  name: string,
  blocks: Array<[number, number | null, number | null, number | null]>,
): Exercise {
  const slug = name.toLowerCase().replace(/\s+/g, '+').replace(/[()]/g, '');
  return {
    id,
    label,
    name,
    youtubeUrl: `https://www.youtube.com/results?search_query=how+to+${slug}+proper+form`,
    setBlocks: blocks.map(([sets, reps, rpe, load]) => ({ sets, reps, rpe, load })),
  };
}

function buildMeta531Days(): WorkoutDay[] {
  const trainingDays: Array<{ label: string; exercises: Exercise[] }> = [
    {
      label: 'Day 1 — Squat / Pause Bench / Leg Press',
      exercises: [
        metaEx('m1d1a', 'A', 'Squat', [[1,5,null,null],[1,5,null,null],[2,5,null,null]]),
        metaEx('m1d1b', 'B', '2ct Pause Bench', [[1,3,null,null],[1,1,5,null],[1,1,7,null],[3,5,null,null]]),
        metaEx('m1d1c', 'C', 'Leg Press', [[3,10,8,null],[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Day 2 — Spoto Press / Deadlift / Accessories',
      exercises: [
        metaEx('m1d2a', 'A', 'Spoto Press', [[1,4,5,null],[1,2,7,null],[2,2,8,null],[2,4,7,null]]),
        metaEx('m1d2b', 'B', 'Deadlift', [[1,5,null,null],[1,5,null,null],[2,5,null,null]]),
        metaEx('m1d2c', 'C', 'Dumbbell Romanian Deadlift', [[3,10,7,null]]),
        metaEx('m1d2d', 'D', 'Pull-Up', [[3,null,null,null]]),
        metaEx('m1d2e', 'E', 'One-arm Dumbbell Row', [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Day 3 — Squat / Close Grip Bench / Accessories',
      exercises: [
        metaEx('m1d3a', 'A', 'Squat', [[1,6,null,null],[1,6,null,null],[1,6,null,null],[2,6,null,null]]),
        metaEx('m1d3b', 'B', '2ct Pause Close Grip Bench', [[1,3,null,null],[1,3,null,null],[2,3,null,null],[2,6,null,null]]),
        metaEx('m1d3c', 'C', 'Dumbbell Military Press', [[3,10,8,null]]),
        metaEx('m1d3d', 'D', 'Dumbbell Bicep Curl', [[3,12,8,null]]),
        metaEx('m1d3e', 'E', 'Overhead Triceps Extension', [[3,12,8,null]]),
      ],
    },
    {
      label: 'Day 4 — Squat / Bench / Deadlift (Competition Prep)',
      exercises: [
        metaEx('m1d4a', 'A', 'Squat', [[1,3,null,null],[1,3,null,6],[2,3,8,null]]),
        metaEx('m1d4b', 'B', 'Bench Press', [[1,3,null,null],[1,3,6,null],[2,3,8,null],[1,3,null,null]]),
        metaEx('m1d4c', 'C', 'Deadlift', [[1,3,null,null],[1,3,6,null],[2,3,8,null],[1,6,null,null]]),
      ],
    },
  ];

  // Mon / Tue / Rest / Thu / Fri / Rest / Rest
  const weekPattern: Array<number | null> = [0, 1, null, 2, 3, null, null];
  return weekPattern.map((trainingIdx, i) => {
    const dayNumber = i + 1;
    if (trainingIdx === null) {
      return { dayNumber, weekNumber: 1, label: 'Rest Day', isRestDay: true, exercises: [] };
    }
    const td = trainingDays[trainingIdx];
    return { dayNumber, weekNumber: 1, label: td.label, isRestDay: false, exercises: td.exercises };
  });
}

export const workoutPlans: WorkoutPlan[] = [
  {
    id: 'plan-meta531',
    level: 'professional',
    name: 'Meta 5/3/1',
    durationWeeks: 1,
    description:
      'A powerlifting-focused 4-day program built around the squat, bench press, and deadlift. Each session prescribes sets, reps, and RPE targets — fields marked "—" are not yet prescribed and should be filled in based on your current training max. Week 1 is loaded; more weeks will be added over time.',
    days: buildMeta531Days(),
    defaultWeeklySchedule: [1, 2, 4, 5], // Mon / Tue / Thu / Fri
  },
];
