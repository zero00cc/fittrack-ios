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
  type TrainingDay = { label: string; exercises: Exercise[] };

  // ── Week 1 ────────────────────────────────────────────────────────────────
  const W1: TrainingDay[] = [
    {
      label: 'Week 1 Day 1 — Squat / Pause Bench / Accessories',
      exercises: [
        metaEx('w1d1a', 'A', 'Squat',           [[1,5,null,null],[1,5,null,null],[2,5,null,null]]),
        metaEx('w1d1b', 'B', '2ct Pause Bench',  [[1,3,null,null],[1,1,5,null],[1,1,7,null],[3,5,null,null]]),
        metaEx('w1d1c', 'C', 'Leg Press',        [[3,10,8,null]]),
        metaEx('w1d1d', 'D', 'Triceps Pushdown', [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Week 1 Day 2 — Spoto Press / Deadlift / Accessories',
      exercises: [
        metaEx('w1d2a', 'A', 'Spoto Press',              [[1,4,5,null],[1,2,7,null],[2,2,8,null],[2,4,7,null]]),
        metaEx('w1d2b', 'B', 'Deadlift',                 [[1,5,null,null],[1,5,null,null],[2,5,null,null]]),
        metaEx('w1d2c', 'C', 'Dumbbell Romanian Deadlift',[[3,10,7,null]]),
        metaEx('w1d2d', 'D', 'Pull-Up',                  [[3,null,null,null]]),
        metaEx('w1d2e', 'E', 'One-arm Dumbbell Row',      [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Week 1 Day 3 — Squat / Close Grip Bench / Accessories',
      exercises: [
        metaEx('w1d3a', 'A', 'Squat',                     [[1,6,null,null],[1,6,null,null],[1,6,null,null],[2,6,null,null]]),
        metaEx('w1d3b', 'B', '2ct Pause Close Grip Bench', [[1,3,null,null],[1,3,null,null],[2,3,null,null],[2,6,null,null]]),
        metaEx('w1d3c', 'C', 'Dumbbell Military Press',    [[3,10,8,null]]),
        metaEx('w1d3d', 'D', 'Dumbbell Bicep Curl',        [[3,12,8,null]]),
        metaEx('w1d3e', 'E', 'Overhead Triceps Extension', [[3,12,8,null]]),
      ],
    },
    {
      label: 'Week 1 Day 4 — Squat / Bench / Deadlift',
      exercises: [
        metaEx('w1d4a', 'A', 'Squat',       [[1,3,null,null],[1,3,null,6],[2,3,8,null]]),
        metaEx('w1d4b', 'B', 'Bench Press', [[1,3,null,null],[1,3,6,null],[2,3,8,null],[1,3,null,null]]),
        metaEx('w1d4c', 'C', 'Deadlift',    [[1,3,null,null],[1,3,6,null],[2,3,8,null],[1,6,null,null]]),
      ],
    },
  ];

  // ── Week 2 ────────────────────────────────────────────────────────────────
  const W2: TrainingDay[] = [
    {
      label: 'Week 2 Day 1 — Squat / Pause Bench / Accessories',
      exercises: [
        metaEx('w2d1a', 'A', 'Squat',           [[1,5,null,null],[1,5,null,null],[1,5,8,null],[1,5,null,null],[1,5,null,null]]),
        metaEx('w2d1b', 'B', '2ct Pause Bench',  [[1,3,null,null],[1,1,5,null],[1,1,7.5,null],[3,5,null,null]]),
        metaEx('w2d1c', 'C', 'Leg Press',        [[3,10,8,null]]),
        metaEx('w2d1d', 'D', 'Triceps Pushdown', [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Week 2 Day 2 — Spoto Press / Deadlift / Accessories',
      exercises: [
        metaEx('w2d2a', 'A', 'Spoto Press',               [[1,4,5,null],[1,2,7,null],[2,2,8,null],[2,4,7,null]]),
        metaEx('w2d2b', 'B', 'Deadlift',                  [[1,5,null,null],[1,5,null,null],[1,5,null,null],[1,5,5,null]]),
        metaEx('w2d2c', 'C', 'Dumbbell Romanian Deadlift', [[3,10,7,null]]),
        metaEx('w2d2d', 'D', 'Pull-Up',                   [[3,null,null,null]]),
        metaEx('w2d2e', 'E', 'One-arm Dumbbell Row',       [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Week 2 Day 3 — Squat / Close Grip Bench / Accessories',
      exercises: [
        metaEx('w2d3a', 'A', 'Squat',                     [[1,6,null,null],[1,6,null,null],[1,6,null,null],[2,6,null,null]]),
        metaEx('w2d3b', 'B', '2ct Pause Close Grip Bench', [[1,3,null,null],[1,3,null,null],[2,3,null,null],[2,6,null,null]]),
        metaEx('w2d3c', 'C', 'Dumbbell Military Press',    [[3,10,8,null]]),
        metaEx('w2d3d', 'D', 'Dumbbell Bicep Curl',        [[3,12,8,null]]),
        metaEx('w2d3e', 'E', 'Overhead Triceps Extension', [[3,12,8,null]]),
      ],
    },
    {
      label: 'Week 2 Day 4 — Squat / Bench / Deadlift',
      exercises: [
        metaEx('w2d4a', 'A', 'Squat',       [[1,3,5,null],[1,3,7,6],[1,3,9,null],[1,3,null,null]]),
        metaEx('w2d4b', 'B', 'Bench Press', [[1,3,5,null],[1,3,7,null],[1,3,9,null],[1,3,null,null]]),
        metaEx('w2d4c', 'C', 'Deadlift',    [[1,3,5,null],[1,3,7,null],[1,3,9,null],[1,3,null,null],[1,6,null,null]]),
      ],
    },
  ];

  // ── Week 3 ────────────────────────────────────────────────────────────────
  const W3: TrainingDay[] = [
    {
      label: 'Week 3 Day 1 — Squat / Pause Bench / Accessories',
      exercises: [
        metaEx('w3d1a', 'A', 'Squat',           [[1,5,null,null],[1,5,null,null],[1,5,null,null],[2,5,8,null]]),
        metaEx('w3d1b', 'B', '2ct Pause Bench',  [[1,3,null,null],[1,1,6,null],[1,1,8.5,null],[4,5,null,null]]),
        metaEx('w3d1c', 'C', 'Leg Press',        [[3,10,8,null]]),
        metaEx('w3d1d', 'D', 'Triceps Pushdown', [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Week 3 Day 2 — Spoto Press / Deadlift / Accessories',
      exercises: [
        metaEx('w3d2a', 'A', 'Spoto Press',               [[1,4,5,null],[1,2,7,null],[2,2,8,null],[2,4,7,null]]),
        metaEx('w3d2b', 'B', 'Deadlift',                  [[1,5,null,null],[1,5,null,null],[2,5,8,null],[1,5,null,null]]),
        metaEx('w3d2c', 'C', 'Dumbbell Romanian Deadlift', [[3,10,7,null]]),
        metaEx('w3d2d', 'D', 'Pull-Up',                   [[3,null,null,null]]),
        metaEx('w3d2e', 'E', 'One-arm Dumbbell Row',       [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Week 3 Day 3 — Squat / Close Grip Bench / Accessories',
      exercises: [
        metaEx('w3d3a', 'A', 'Squat',                     [[1,3,null,null],[1,3,null,null],[2,3,null,null],[2,6,null,null]]),
        metaEx('w3d3b', 'B', '2ct Pause Close Grip Bench', [[1,3,null,null],[1,3,null,null],[3,3,null,null],[2,6,null,null]]),
        metaEx('w3d3c', 'C', 'Dumbbell Military Press',    [[3,10,8,null]]),
        metaEx('w3d3d', 'D', 'Dumbbell Bicep Curl',        [[3,12,8,null]]),
        metaEx('w3d3e', 'E', 'Overhead Triceps Extension', [[3,12,8,null]]),
      ],
    },
    {
      label: 'Week 3 Day 4 — Squat / Bench / Deadlift',
      exercises: [
        metaEx('w3d4a', 'A', 'Squat',       [[1,1,5,null],[1,1,6,null],[1,1,8,null],[1,3,null,null],[1,3,null,null]]),
        metaEx('w3d4b', 'B', 'Bench Press', [[1,1,5,null],[1,1,6,null],[1,1,8,null],[1,3,null,null],[1,3,null,null]]),
        metaEx('w3d4c', 'C', 'Deadlift',    [[1,1,5,null],[1,1,6,null],[1,1,8,null],[1,3,null,null],[1,3,null,null]]),
      ],
    },
  ];

  // ── Week 4 ────────────────────────────────────────────────────────────────
  const W4: TrainingDay[] = [
    {
      label: 'Week 4 Day 1 — Squat / Pause Bench / Accessories',
      exercises: [
        metaEx('w4d1a', 'A', 'Squat',           [[1,5,null,null],[1,5,null,null],[4,5,null,null]]),
        metaEx('w4d1b', 'B', '2ct Pause Bench',  [[1,3,null,null],[1,1,6,null],[1,1,8,null],[4,5,null,null]]),
        metaEx('w4d1c', 'C', 'Leg Press',        [[3,10,8,null]]),
        metaEx('w4d1d', 'D', 'Triceps Pushdown', [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Week 4 Day 2 — Spoto Press / Deadlift / Accessories',
      exercises: [
        metaEx('w4d2a', 'A', 'Spoto Press',               [[1,4,5,null],[1,2,7,null],[2,2,8,null],[2,4,7,null]]),
        metaEx('w4d2b', 'B', 'Deadlift',                  [[1,5,null,null],[1,5,null,null],[1,5,null,null],[1,5,9,null]]),
        metaEx('w4d2c', 'C', 'Dumbbell Romanian Deadlift', [[3,10,7,null]]),
        metaEx('w4d2d', 'D', 'Pull-Up',                   [[3,null,null,null]]),
        metaEx('w4d2e', 'E', 'One-arm Dumbbell Row',       [[2,8,6,null],[2,8,8,null]]),
      ],
    },
    {
      label: 'Week 4 Day 3 — Squat / Close Grip Bench',
      exercises: [
        metaEx('w4d3a', 'A', 'Squat',                     [[1,3,null,null],[1,3,null,null],[2,3,null,null],[2,6,null,null]]),
        metaEx('w4d3b', 'B', '2ct Pause Close Grip Bench', [[1,3,null,null],[1,3,null,null],[2,3,null,null],[2,6,null,null]]),
      ],
    },
    {
      label: 'Week 4 Day 4 — Squat / Bench / Deadlift',
      exercises: [
        metaEx('w4d4a', 'A', 'Squat',       [[1,1,5,null],[1,1,7.6,null],[1,1,9,null],[2,3,null,null]]),
        metaEx('w4d4b', 'B', 'Bench Press', [[1,1,5,null],[1,1,7.5,null],[1,1,9,null],[2,3,null,null]]),
        metaEx('w4d4c', 'C', 'Deadlift',    [[1,1,5,null],[1,1,7.5,null],[1,1,9,null],[2,3,null,null]]),
      ],
    },
  ];

  // Weekly layout: Mon / Tue / Rest / Thu / Fri / Rest / Rest
  const weekPattern: Array<number | null> = [0, 1, null, 2, 3, null, null];
  const weeks = [W1, W2, W3, W4];
  const days: WorkoutDay[] = [];

  weeks.forEach((week, w) => {
    weekPattern.forEach((trainingIdx, i) => {
      const dayNumber = w * 7 + i + 1;
      if (trainingIdx === null) {
        days.push({ dayNumber, weekNumber: w + 1, label: 'Rest Day', isRestDay: true, exercises: [] });
      } else {
        const td = week[trainingIdx];
        days.push({ dayNumber, weekNumber: w + 1, label: td.label, isRestDay: false, exercises: td.exercises });
      }
    });
  });

  return days;
}

export const workoutPlans: WorkoutPlan[] = [
  {
    id: 'plan-meta531',
    level: 'professional',
    name: 'Meta 5/3/1',
    durationWeeks: 4,
    description:
      'A 4-week powerlifting program built around the squat, bench press, and deadlift. Each session prescribes sets, reps, and RPE targets — fields marked "—" are open and should be filled in based on your current training max.',
    days: buildMeta531Days(),
    defaultWeeklySchedule: [1, 2, 4, 5], // Mon / Tue / Thu / Fri
  },
];
