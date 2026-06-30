import { WorkoutPlan, WorkoutDay, Exercise, SetBlock } from '../types/workout.types';

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

// metaExI: like metaEx but supports liftType + intensity (% of PR) per set block.
// Tuple: [sets, reps, rpe, load, intensity] — null means user-prescribed / not applicable.
function metaExI(
  id: string,
  label: string,
  name: string,
  liftType: Exercise['liftType'] | null,
  blocks: Array<[number, number | null, number | null, number | null, number | null]>,
): Exercise {
  const slug = name.toLowerCase().replace(/\s+/g, '+').replace(/[()]/g, '');
  return {
    id,
    label,
    name,
    liftType: liftType ?? undefined,
    youtubeUrl: `https://www.youtube.com/results?search_query=how+to+${slug}+proper+form`,
    setBlocks: blocks.map(([sets, reps, rpe, load, intensity]): SetBlock => ({
      sets, reps, rpe, load, ...(intensity !== null ? { intensity } : {}),
    })),
  };
}

// Shared helper — builds a flat WorkoutDay[] from weekly training days + a week pattern.
// weekPattern: indices into the trainingDays array (per week), null = rest day.
function flattenWeeks(
  allWeeks: Array<Array<{ label: string; exercises: Exercise[] }>>,
  weekPattern: Array<number | null>,
): WorkoutDay[] {
  const days: WorkoutDay[] = [];
  allWeeks.forEach((week, w) => {
    weekPattern.forEach((idx, i) => {
      const dayNumber = w * weekPattern.length + i + 1;
      if (idx === null) {
        days.push({ dayNumber, weekNumber: w + 1, label: 'Rest Day', isRestDay: true, exercises: [] });
      } else {
        const td = week[idx];
        days.push({ dayNumber, weekNumber: w + 1, label: td.label, isRestDay: false, exercises: td.exercises });
      }
    });
  });
  return days;
}

// ── Beginner Powerlifting Level 1 ────────────────────────────────────────────
// 6 weeks × 3 days (Mon/Wed/Fri). Day-label format: "Week W Day D — <focus>".
function buildBPL1Days(): WorkoutDay[] {
  const W: Array<Array<{ label: string; exercises: Exercise[] }>> = [
    // Week 1
    [
      {
        label: 'Week 1 Day 1 — Squat / Pause Bench / Accessories',
        exercises: [
          metaExI('bpl1_w1d1a','A','Squat',              'squat',    [[1,5,5,null,74],[2,1,7,null,79],[1,5,null,null,72]]),
          metaExI('bpl1_w1d1b','B','3ct Pause Bench',    'bench',    [[1,4,5,null,76],[2,4,7,null,82],[1,4,null,null,77]]),
          metaExI('bpl1_w1d1c','C','Leg Extension',      null,       [[4,10,9,null,null]]),
          metaExI('bpl1_w1d1d','D','Triceps Pushdown',   null,       [[3,10,9,null,null]]),
        ],
      },
      {
        label: 'Week 1 Day 2 — Deadlift / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w1d2a','A','Deadlift',           'deadlift', [[1,5,5,null,74],[1,5,7,null,79],[1,5,null,null,75],[1,5,null,null,71]]),
          metaExI('bpl1_w1d2b','B','Bench',              'bench',    [[1,3,6,null,82],[1,3,8,null,87],[1,3,null,null,82],[2,3,null,null,78]]),
          metaExI('bpl1_w1d2c','C','Leg Press',          null,       [[1,8,5,null,null],[1,8,6,null,null],[3,8,8,null,null]]),
        ],
      },
      {
        label: 'Week 1 Day 3 — Tempo Squat / Squat / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w1d3a','A','Tempo 3:1:3 Squat', 'squat',    [[1,5,5,null,84],[2,1,7,null,89]]),
          metaExI('bpl1_w1d3b','B','Squat',              'squat',    [[1,7,5,null,70],[2,7,7,null,75],[1,7,5,null,70]]),
          metaExI('bpl1_w1d3c','C','Bench',              'bench',    [[1,1,5,null,85],[2,1,7,null,91],[1,7,8,null,78],[2,7,7,null,73]]),
          metaExI('bpl1_w1d3d','D','Dumbbell Bench',     null,       [[1,6,5,null,null],[2,6,7,null,null]]),
        ],
      },
    ],
    // Week 2
    [
      {
        label: 'Week 2 Day 1 — Squat / Pause Bench / Accessories',
        exercises: [
          metaExI('bpl1_w2d1a','A','Squat',              'squat',    [[1,5,null,null,77],[2,5,null,null,82],[1,5,null,null,75]]),
          metaExI('bpl1_w2d1b','B','3ct Pause Bench',    'bench',    [[1,4,5,null,76],[3,4,7,null,82]]),
          metaExI('bpl1_w2d1c','C','Leg Extension',      null,       [[4,10,9,null,null]]),
          metaExI('bpl1_w2d1d','D','Triceps Pushdown',   null,       [[3,10,9,null,null]]),
        ],
      },
      {
        label: 'Week 2 Day 2 — Deadlift / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w2d2a','A','Deadlift',           'deadlift', [[1,5,6,null,79],[1,5,8,null,84],[1,5,null,null,77],[1,5,null,null,73]]),
          metaExI('bpl1_w2d2b','B','Bench',              'bench',    [[1,3,6,null,84],[1,3,8,null,89],[1,3,null,null,82],[2,3,null,null,78]]),
          metaExI('bpl1_w2d2c','C','Leg Press',          null,       [[1,8,5,null,null],[1,8,6,null,null],[3,8,8,null,null]]),
        ],
      },
      {
        label: 'Week 2 Day 3 — Tempo Squat / Squat / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w2d3a','A','Tempo 3:1:3 Squat', 'squat',    [[1,1,5,null,84],[2,1,7,null,89]]),
          metaExI('bpl1_w2d3b','B','Squat',              'squat',    [[1,7,5,null,70],[2,7,7,null,77],[1,7,6,null,73]]),
          metaExI('bpl1_w2d3c','C','Bench',              'bench',    [[1,1,6,null,87],[1,1,8,null,94],[1,7,8,null,78],[2,7,7,null,73]]),
          metaExI('bpl1_w2d3d','D','Dumbbell Bench',     null,       [[1,6,5,null,null],[1,6,7,null,null],[2,6,8,null,null]]),
        ],
      },
    ],
    // Week 3
    [
      {
        label: 'Week 3 Day 1 — Squat / Pause Bench / Accessories',
        exercises: [
          metaExI('bpl1_w3d1a','A','Squat',              'squat',    [[1,4,6,null,79],[2,4,8,null,84],[1,4,6,null,79]]),
          metaExI('bpl1_w3d1b','B','3ct Pause Bench',    'bench',    [[1,4,5,null,76],[3,4,7,null,82]]),
          metaExI('bpl1_w3d1c','C','Leg Extension',      null,       [[4,10,9,null,null]]),
          metaExI('bpl1_w3d1d','D','Triceps Pushdown',   null,       [[3,10,9,null,null]]),
        ],
      },
      {
        label: 'Week 3 Day 2 — Deadlift / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w3d2a','A','Deadlift',           'deadlift', [[1,4,6,null,81],[1,4,8,null,87],[1,4,null,null,79],[2,4,null,null,72]]),
          metaExI('bpl1_w3d2b','B','Bench',              'bench',    [[1,3,6,null,84],[1,3,8,null,89],[1,3,null,null,82],[2,3,null,null,78]]),
          metaExI('bpl1_w3d2c','C','Leg Press',          null,       [[1,8,5,null,null],[1,8,6,null,null],[3,8,8,null,null]]),
        ],
      },
      {
        label: 'Week 3 Day 3 — Squat / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w3d3a','A','Squat',              'squat',    [[1,1,6,null,87],[2,1,7,null,91],[2,7,7,null,75],[1,7,5,null,69]]),
          metaExI('bpl1_w3d3b','B','Bench',              'bench',    [[1,1,6,null,87],[1,1,8,null,94],[1,7,8,null,78],[2,7,7,null,73]]),
          metaExI('bpl1_w3d3c','C','Dumbbell Bench',     null,       [[1,6,5,null,null],[1,6,7,null,null],[2,6,8,null,null]]),
        ],
      },
    ],
    // Week 4
    [
      {
        label: 'Week 4 Day 1 — Squat / Pause Bench / Accessories',
        exercises: [
          metaExI('bpl1_w4d1a','A','Squat',              'squat',    [[1,4,6,null,79],[2,4,8,null,86],[1,4,7,null,82]]),
          metaExI('bpl1_w4d1b','B','3ct Pause Bench',    'bench',    [[1,4,5,null,76],[3,4,7,null,82]]),
          metaExI('bpl1_w4d1c','C','Leg Extension',      null,       [[4,10,9,null,null]]),
          metaExI('bpl1_w4d1d','D','Triceps Pushdown',   null,       [[3,10,9,null,null]]),
        ],
      },
      {
        label: 'Week 4 Day 2 — Deadlift / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w4d2a','A','Deadlift',           'deadlift', [[1,3,6,null,84],[1,3,8,null,90],[1,3,null,null,81],[2,3,null,null,74]]),
          metaExI('bpl1_w4d2b','B','Bench',              'bench',    [[1,3,5,null,79],[1,3,7,null,85],[1,3,9,null,91],[1,3,null,null,82],[2,3,null,null,77]]),
          metaExI('bpl1_w4d2c','C','Leg Press',          null,       [[1,8,5,null,null],[1,8,6,null,null],[3,8,8,null,null]]),
        ],
      },
      {
        label: 'Week 4 Day 3 — Squat / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w4d3a','A','Squat',              'squat',    [[1,1,6,null,87],[1,1,7,null,94],[1,7,7,null,91],[3,7,7,null,74]]),
          metaExI('bpl1_w4d3b','B','Bench',              'bench',    [[1,1,6,null,87],[1,1,8,null,94],[1,7,8,null,78],[2,7,7,null,73]]),
          metaExI('bpl1_w4d3c','C','Dumbbell Bench',     null,       [[1,6,5,null,null],[1,6,7,null,null],[2,6,8,null,null]]),
        ],
      },
    ],
    // Week 5
    [
      {
        label: 'Week 5 Day 1 — Squat / Pause Bench / Accessories',
        exercises: [
          metaExI('bpl1_w5d1a','A','Squat',              'squat',    [[1,4,5,null,77],[2,4,7,null,82]]),
          metaExI('bpl1_w5d1b','B','3ct Pause Bench',    'bench',    [[1,4,5,null,76],[3,4,7,null,82]]),
          metaExI('bpl1_w5d1c','C','Leg Extension',      null,       [[4,10,9,null,null]]),
          metaExI('bpl1_w5d1d','D','Triceps Pushdown',   null,       [[3,10,9,null,null]]),
        ],
      },
      {
        label: 'Week 5 Day 2 — Deadlift / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w5d2a','A','Deadlift',           'deadlift', [[1,1,6,null,86],[1,1,8,null,92],[1,1,9,null,97],[3,3,7,null,83]]),
          metaExI('bpl1_w5d2b','B','Bench',              'bench',    [[1,3,5,null,79],[2,3,null,null,84],[1,3,null,null,80]]),
          metaExI('bpl1_w5d2c','C','Leg Press',          null,       [[1,8,5,null,null],[1,8,6,null,null],[3,8,8,null,null]]),
        ],
      },
      {
        label: 'Week 5 Day 3 — Squat / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w5d3a','A','Squat',              'squat',    [[1,1,6,null,87],[1,1,8,null,94],[1,1,9,null,97],[2,7,6,null,71]]),
          metaExI('bpl1_w5d3b','B','Bench',              'bench',    [[1,1,6,null,87],[1,1,8,null,94],[1,1,9,null,97],[2,7,7,null,73]]),
          metaExI('bpl1_w5d3c','C','Dumbbell Bench',     null,       [[1,6,5,null,null],[1,6,7,null,null],[1,6,8,null,null],[1,6,9,null,null]]),
        ],
      },
    ],
    // Week 6
    [
      {
        label: 'Week 6 Day 1 — Squat / Pause Bench / Accessories',
        exercises: [
          metaExI('bpl1_w6d1a','A','Squat',              'squat',    [[1,6,5,null,71],[1,6,null,null,77],[1,6,null,null,69],[1,6,null,null,65]]),
          metaExI('bpl1_w6d1b','B','3ct Pause Bench',    'bench',    [[1,5,6,null,71],[1,6,7,null,77],[1,6,null,null,69],[1,6,null,null,65]]),
          metaExI('bpl1_w6d1c','C','Leg Extension',      null,       [[3,8,7,null,null]]),
          metaExI('bpl1_w6d1d','D','Triceps Pushdown',   null,       [[3,10,7,null,null]]),
        ],
      },
      {
        label: 'Week 6 Day 2 — Deadlift / Close Grip Bench / Accessories',
        exercises: [
          metaExI('bpl1_w6d2a','A','Deadlift',           'deadlift', [[1,7,5,null,69],[1,7,7,null,75],[1,7,null,null,64]]),
          metaExI('bpl1_w6d2b','B','Close Grip Bench',   'bench',    [[1,5,5,null,75],[1,5,6,null,78],[1,5,7,null,80],[1,5,null,null,71]]),
          metaExI('bpl1_w6d2c','C','Leg Press',          null,       [[1,6,5,null,null],[1,6,5,null,null],[3,6,7,null,null]]),
        ],
      },
      {
        label: 'Week 6 Day 3 — High Bar Squat / Bench / Accessories',
        exercises: [
          metaExI('bpl1_w6d3a','A','High Bar Squat',     'squat',    [[1,5,5,null,74],[2,5,7,null,79]]),
          metaExI('bpl1_w6d3b','B','Bench',              'bench',    [[1,10,6,null,64],[1,10,8,null,70],[1,10,null,null,61],[1,10,null,null,58]]),
          metaExI('bpl1_w6d3c','C','Pec Deck Machine',   null,       [[1,10,5,null,null],[2,10,7,null,null]]),
        ],
      },
    ],
  ];
  // Mon / Rest / Wed / Rest / Fri / Rest / Rest
  return flattenWeeks(W, [0, null, 1, null, 2, null, null]);
}

// ── Intermediate Power ────────────────────────────────────────────────────────
// 5 weeks × 4 days (Mon/Tue/Thu/Fri).
function buildIPDays(): WorkoutDay[] {
  const W: Array<Array<{ label: string; exercises: Exercise[] }>> = [
    // Week 1
    [
      {
        label: 'Week 1 Day 1 — Squat / Pause Bench / Chest',
        exercises: [
          metaExI('ip_w1d1a','A','Squat',                     'squat',    [[1,5,null,null,68],[1,5,5,null,76],[3,5,7,null,82]]),
          metaExI('ip_w1d1b','B','3ct Pause Bench',           'bench',    [[1,3,null,null,60],[1,3,6,null,70],[3,3,8,null,80],[1,1,8,null,88]]),
          metaExI('ip_w1d1c','C','Chest Machine',             null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 1 Day 2 — Close Grip / Deadlift / Accessories',
        exercises: [
          metaExI('ip_w1d2a','A','Close Grip Bench',          'bench',    [[1,5,null,null,60],[1,5,null,null,70],[4,5,7,null,78]]),
          metaExI('ip_w1d2b','B','Deadlift',                  'deadlift', [[1,5,null,null,68],[1,5,5,null,76],[2,5,7,null,82],[1,5,null,null,72]]),
          metaExI('ip_w1d2c','C','2ct Pause Deadlift',        'deadlift', [[3,3,null,null,70]]),
          metaExI('ip_w1d2d','D','Dumbbell Romanian Deadlift','deadlift', [[3,12,7,null,null]]),
          metaExI('ip_w1d2e','E','Leg Press',                 null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 1 Day 3 — Squat / High Bar / Bench / Accessories',
        exercises: [
          metaExI('ip_w1d3a','A','Squat',                     'squat',    [[1,3,null,null,70],[1,3,null,null,79],[2,3,null,null,84]]),
          metaExI('ip_w1d3b','B','High Bar Squat',            'squat',    [[3,6,7,null,60]]),
          metaExI('ip_w1d3c','C','Bench',                     'bench',    [[1,5,null,null,66],[1,5,null,null,74],[2,5,8,null,80]]),
          metaExI('ip_w1d3d','D','Tempo 3:1:0 Bench',        'bench',    [[3,3,null,null,75]]),
          metaExI('ip_w1d3e','E','Overhead Triceps Extension',null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 1 Day 4 — Squat / Bench / Deadlift (Heavy)',
        exercises: [
          metaExI('ip_w1d4a','A','Squat',                     'squat',    [[1,1,null,null,76],[1,1,5,null,83],[2,1,7,null,90]]),
          metaExI('ip_w1d4b','B','Bench',                     'bench',    [[1,1,null,null,78],[1,1,6,null,87],[2,1,8,null,93]]),
          metaExI('ip_w1d4c','C','Larsen Press',              'bench',    [[3,6,7,null,65]]),
          metaExI('ip_w1d4d','D','Deadlift',                  'deadlift', [[1,1,null,null,76],[1,1,5,null,83],[2,1,7,null,90],[1,4,7,null,83],[2,4,null,null,73]]),
        ],
      },
    ],
    // Week 2
    [
      {
        label: 'Week 2 Day 1 — Squat / Pause Bench / Chest',
        exercises: [
          metaExI('ip_w2d1a','A','Squat',                     'squat',    [[1,5,null,null,68],[1,5,6,null,78],[2,5,8,null,86],[1,5,null,null,78]]),
          metaExI('ip_w2d1b','B','3ct Pause Bench',           'bench',    [[1,3,null,null,60],[1,3,6,null,70],[3,3,8,null,80],[1,1,8,null,88]]),
          metaExI('ip_w2d1c','C','Chest Machine',             null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 2 Day 2 — Close Grip / Deadlift / Accessories',
        exercises: [
          metaExI('ip_w2d2a','A','Close Grip Bench',          'bench',    [[1,5,null,null,60],[1,5,null,null,70],[1,5,7,null,78],[2,5,8,null,82]]),
          metaExI('ip_w2d2b','B','Deadlift',                  'deadlift', [[1,4,null,null,70],[1,4,5,null,80],[1,4,7,null,88],[1,4,null,null,80]]),
          metaExI('ip_w2d2c','C','2ct Pause Deadlift',        'deadlift', [[3,3,null,null,70]]),
          metaExI('ip_w2d2d','D','Dumbbell Romanian Deadlift','deadlift', [[3,12,7,null,null]]),
          metaExI('ip_w2d2e','E','Leg Press',                 null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 2 Day 3 — Squat / High Bar / Bench / Accessories',
        exercises: [
          metaExI('ip_w2d3a','A','Squat',                     'squat',    [[1,3,null,null,70],[1,3,5,null,79],[1,3,8,null,88],[1,3,7,null,82]]),
          metaExI('ip_w2d3b','B','High Bar Squat',            'squat',    [[3,6,7,null,60]]),
          metaExI('ip_w2d3c','C','Bench',                     'bench',    [[1,5,null,null,66],[1,5,null,null,74],[2,5,8,null,80]]),
          metaExI('ip_w2d3d','D','Tempo 3:1:0 Bench',        'bench',    [[3,3,null,null,75]]),
          metaExI('ip_w2d3e','E','Overhead Triceps Extension',null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 2 Day 4 — Squat / Bench / Deadlift (Heavy)',
        exercises: [
          metaExI('ip_w2d4a','A','Squat',                     'squat',    [[1,1,null,null,78],[1,1,6,null,87],[2,1,8,null,93]]),
          metaExI('ip_w2d4b','B','Bench',                     'bench',    [[1,1,null,null,78],[1,1,6,null,87],[2,1,8,null,93]]),
          metaExI('ip_w2d4c','C','Larsen Press',              'bench',    [[3,6,7,null,65]]),
          metaExI('ip_w2d4d','D','Deadlift',                  'deadlift', [[1,1,null,null,78],[1,1,6,null,87],[1,1,8,null,93],[1,3,8,null,88],[2,3,null,null,73]]),
        ],
      },
    ],
    // Week 3
    [
      {
        label: 'Week 3 Day 1 — Squat / Pause Bench / Chest',
        exercises: [
          metaExI('ip_w3d1a','A','Squat',                     'squat',    [[1,3,5,null,75],[1,3,7,null,83],[2,5,9,null,91],[2,3,null,null,80]]),
          metaExI('ip_w3d1b','B','3ct Pause Bench',           'bench',    [[1,3,null,null,60],[1,3,6,null,70],[3,3,8,null,80],[1,1,8,null,88]]),
          metaExI('ip_w3d1c','C','Chest Machine',             null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 3 Day 2 — Close Grip / Deadlift / Accessories',
        exercises: [
          metaExI('ip_w3d2a','A','Close Grip Bench',          'bench',    [[1,5,null,null,60],[1,5,null,null,70],[1,5,7,null,78],[2,5,8,null,82]]),
          metaExI('ip_w3d2b','B','Deadlift',                  'deadlift', [[1,3,null,null,74],[1,3,6,null,82],[1,3,8,null,91],[1,3,null,null,85]]),
          metaExI('ip_w3d2c','C','2ct Pause Deadlift',        'deadlift', [[3,3,null,null,75]]),
          metaExI('ip_w3d2d','D','Dumbbell Romanian Deadlift','deadlift', [[3,12,7,null,null]]),
          metaExI('ip_w3d2e','E','Leg Press',                 null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 3 Day 3 — Squat / High Bar / Bench / Accessories',
        exercises: [
          metaExI('ip_w3d3a','A','Squat',                     'squat',    [[1,3,null,null,60],[1,3,null,null,70],[3,3,null,null,80]]),
          metaExI('ip_w3d3b','B','High Bar Squat',            'squat',    [[3,6,7,null,60]]),
          metaExI('ip_w3d3c','C','Bench',                     'bench',    [[1,5,null,null,70],[1,5,6,null,78],[1,5,9,null,84],[1,5,null,null,78]]),
          metaExI('ip_w3d3d','D','Tempo 3:1:0 Bench',        'bench',    [[2,3,null,null,75]]),
          metaExI('ip_w3d3e','E','Overhead Triceps Extension',null,       [[3,10,8,null,null]]),
        ],
      },
      {
        label: 'Week 3 Day 4 — Squat / Bench / Deadlift (Heavy)',
        exercises: [
          metaExI('ip_w3d4a','A','Squat',                     'squat',    [[1,1,null,null,83],[1,1,7.5,null,90],[1,1,9,null,95]]),
          metaExI('ip_w3d4b','B','Bench',                     'bench',    [[1,1,5,null,83],[1,1,7.5,null,90],[1,1,9,null,96],[1,1,7,null,88]]),
          metaExI('ip_w3d4c','C','Larsen Press',              'bench',    [[3,6,7,null,65]]),
          metaExI('ip_w3d4d','D','Deadlift',                  'deadlift', [[1,1,5,null,83],[1,1,7.5,null,90],[1,1,9,null,96],[3,6,null,null,77]]),
        ],
      },
    ],
    // Week 4 — Deload / Max Test
    [
      {
        label: 'Week 4 Day 1 — Deload Squat / Pause Bench',
        exercises: [
          metaExI('ip_w4d1a','A','Squat',                     'squat',    [[1,3,null,null,70],[1,3,5,null,78],[2,3,7,null,84],[1,3,null,null,78]]),
          metaExI('ip_w4d1b','B','3ct Pause Bench',           'bench',    [[1,3,null,null,78],[1,3,6,null,85],[3,3,8,null,78]]),
        ],
      },
      {
        label: 'Week 4 Day 2 — Deload Close Grip / Deadlift',
        exercises: [
          metaExI('ip_w4d2a','A','Close Grip Bench',          'bench',    [[1,5,null,null,56],[1,5,null,null,66],[3,5,6,null,72]]),
          metaExI('ip_w4d2b','B','Deadlift',                  'deadlift', [[1,3,null,null,70],[1,3,5,null,78],[1,3,7,null,84],[1,3,8,null,78],[1,3,null,null,70]]),
        ],
      },
      {
        label: 'Week 4 Day 3 — Light Squat / Bench',
        exercises: [
          metaExI('ip_w4d3a','A','Squat',                     'squat',    [[1,5,null,null,50],[1,5,null,null,60],[2,5,null,null,70]]),
          metaExI('ip_w4d3b','B','Bench',                     'bench',    [[1,5,null,null,50],[1,5,null,null,60],[2,5,null,null,70]]),
        ],
      },
      {
        label: 'Week 4 Day 4 — Max Attempt Day',
        exercises: [
          metaExI('ip_w4d4a','A','Squat',                     'squat',    [[1,1,6,null,86],[1,1,8,null,93],[1,1,10,null,100]]),
          metaExI('ip_w4d4b','B','Bench',                     'bench',    [[1,1,6,null,86],[1,1,8,null,93],[1,1,10,null,106]]),
          metaExI('ip_w4d4c','C','Deadlift',                  'deadlift', [[1,1,6,null,86],[1,1,8,null,93],[1,1,10,null,100]]),
        ],
      },
    ],
    // Week 5 — Hypertrophy / Volume
    [
      {
        label: 'Week 5 Day 1 — Squat / Pause Bench / Accessories',
        exercises: [
          metaExI('ip_w5d1a','A','Squat',                     'squat',    [[1,6,null,null,62],[1,6,5,null,70],[3,6,7,null,76]]),
          metaExI('ip_w5d1b','B','2ct Pause Bench',           'bench',    [[1,3,null,null,60],[1,3,6,null,70],[3,3,8,null,80]]),
          metaExI('ip_w5d1c','C','Triceps Pushdown',          null,       [[4,10,7,null,null]]),
          metaExI('ip_w5d1d','D','Dumbbell Bicep Curl',       null,       [[4,10,7,null,null]]),
        ],
      },
      {
        label: 'Week 5 Day 2 — Dumbbell Bench / Deadlift / Pullups',
        exercises: [
          metaExI('ip_w5d2a','A','Dumbbell Bench',            null,       [[4,5,7,null,null]]),
          metaExI('ip_w5d2b','B','Deadlift',                  'deadlift', [[1,6,null,null,62],[1,6,5,null,70],[3,6,7,null,76]]),
          metaExI('ip_w5d2c','C','Pullups',                   null,       [[3,12,null,null,null]]),
        ],
      },
      {
        label: 'Week 5 Day 3 — Tempo Squat / Bench / Accessories',
        exercises: [
          metaExI('ip_w5d3a','A','Tempo 3:1:3 Squat',        'squat',    [[1,4,null,null,60],[1,4,null,null,68],[3,4,null,null,75]]),
          metaExI('ip_w5d3b','B','Leg Press',                 null,       [[3,12,8,null,null]]),
          metaExI('ip_w5d3c','C','Bench',                     'bench',    [[1,10,null,null,57],[1,10,6,null,63],[2,10,8,null,70],[1,10,null,null,60]]),
          metaExI('ip_w5d3d','D','Overhead Triceps Extension',null,       [[3,12,8,null,null]]),
        ],
      },
      {
        label: 'Week 5 Day 4 — Squat / Bench / Deadlift (Volume)',
        exercises: [
          metaExI('ip_w5d4a','A','Squat',                     'squat',    [[1,1,null,null,78],[1,1,null,null,83],[1,1,null,null,88],[2,3,null,null,80]]),
          metaExI('ip_w5d4b','B','Bench',                     'bench',    [[1,1,null,null,78],[1,1,null,null,83],[1,1,null,null,88],[2,3,null,null,80]]),
          metaExI('ip_w5d4c','C','Deadlift',                  'deadlift', [[1,1,null,null,79],[1,1,null,null,83],[1,1,null,null,88],[1,3,null,null,83],[2,6,null,null,75]]),
        ],
      },
    ],
  ];
  // Mon / Tue / Rest / Thu / Fri / Rest / Rest
  return flattenWeeks(W, [0, 1, null, 2, 3, null, null]);
}

// ── Intermediate Powerlifting Level 1 ────────────────────────────────────────
// 5 weeks × 3 days (Mon/Wed/Fri).
function buildIPL1Days(): WorkoutDay[] {
  const W: Array<Array<{ label: string; exercises: Exercise[] }>> = [
    // Week 1
    [
      {
        label: 'Week 1 Day 1 — Squat / Tempo Squat / Pause Bench',
        exercises: [
          metaExI('ipl1_w1d1a','A','Squat',              'squat',    [[1,3,5,null,79],[2,3,7,null,84]]),
          metaExI('ipl1_w1d1b','B','Tempo 3:1:3 Squat', 'squat',    [[3,5,7,null,77]]),
          metaExI('ipl1_w1d1c','C','2ct Pause Bench',    'bench',    [[1,3,6,null,82],[2,3,8,null,87],[1,3,null,null,82]]),
        ],
      },
      {
        label: 'Week 1 Day 2 — Bench / Deadlift / Halt Deadlift',
        exercises: [
          metaExI('ipl1_w1d2a','A','Bench',              'bench',    [[1,7,6,null,71],[1,7,8,null,77],[1,7,null,null,71],[2,7,null,null,66]]),
          metaExI('ipl1_w1d2b','B','Deadlift',           'deadlift', [[1,3,5,null,79],[1,3,7,null,84],[1,3,6,null,81]]),
          metaExI('ipl1_w1d2c','C','Halt Deadlift',      'deadlift', [[1,3,6,null,75],[1,3,8,null,80],[1,3,6,null,77]]),
        ],
      },
      {
        label: 'Week 1 Day 3 — Squat / Bench / Deadlift (Heavy)',
        exercises: [
          metaExI('ipl1_w1d3a','A','Squat',              'squat',    [[1,1,5,null,84],[1,1,7,null,90],[1,7,8,null,77],[1,7,null,null,69]]),
          metaExI('ipl1_w1d3b','B','Bench',              'bench',    [[1,1,6,null,86],[1,1,8,null,93],[1,1,7,null,90],[2,5,8,null,82]]),
          metaExI('ipl1_w1d3c','C','Deadlift',           'deadlift', [[1,1,5,null,84],[1,1,7,null,90],[1,5,8,null,82],[2,5,null,null,73]]),
        ],
      },
    ],
    // Week 2
    [
      {
        label: 'Week 2 Day 1 — Squat / Tempo Squat / Pause Bench',
        exercises: [
          metaExI('ipl1_w2d1a','A','Squat',              'squat',    [[1,3,6,null,81],[1,3,7,null,84],[1,3,8,null,88]]),
          metaExI('ipl1_w2d1b','B','Tempo 3:1:3 Squat', 'squat',    [[3,5,7,null,77]]),
          metaExI('ipl1_w2d1c','C','2ct Pause Bench',    'bench',    [[1,3,6,null,82],[2,3,8,null,87],[1,3,null,null,82]]),
        ],
      },
      {
        label: 'Week 2 Day 2 — Bench / Deadlift / Halt Deadlift',
        exercises: [
          metaExI('ipl1_w2d2a','A','Bench',              'bench',    [[1,7,6,null,71],[1,7,8,null,77],[1,7,null,null,71],[2,7,null,null,66]]),
          metaExI('ipl1_w2d2b','B','Deadlift',           'deadlift', [[1,3,6,null,81],[1,3,8,null,87],[1,3,5,null,80]]),
          metaExI('ipl1_w2d2c','C','Halt Deadlift',      'deadlift', [[1,3,6,null,75],[2,3,8,null,80],[1,3,6,null,77]]),
        ],
      },
      {
        label: 'Week 2 Day 3 — Squat / Bench / Deadlift (Heavy)',
        exercises: [
          metaExI('ipl1_w2d3a','A','Squat',              'squat',    [[1,1,6,null,86],[1,1,8,null,93],[1,7,8,null,77],[1,7,null,null,69]]),
          metaExI('ipl1_w2d3b','B','Bench',              'bench',    [[1,1,6,null,86],[1,1,8,null,93],[1,1,7,null,90],[2,5,8,null,82]]),
          metaExI('ipl1_w2d3c','C','Deadlift',           'deadlift', [[1,1,6,null,86],[1,1,8,null,93],[1,5,8,null,82],[2,5,null,null,73]]),
        ],
      },
    ],
    // Week 3
    [
      {
        label: 'Week 3 Day 1 — Squat / Tempo Squat / Pause Bench',
        exercises: [
          metaExI('ipl1_w3d1a','A','Squat',              'squat',    [[1,3,5,null,79],[1,3,7,null,85],[1,3,9,null,90]]),
          metaExI('ipl1_w3d1b','B','Tempo 3:1:3 Squat', 'squat',    [[3,5,7,null,77]]),
          metaExI('ipl1_w3d1c','C','2ct Pause Bench',    'bench',    [[1,3,5,null,80],[1,3,7,null,85],[1,3,9,null,90],[1,3,null,null,82],[1,3,null,null,78]]),
        ],
      },
      {
        label: 'Week 3 Day 2 — Bench / Deadlift / Halt Deadlift',
        exercises: [
          metaExI('ipl1_w3d2a','A','Bench',              'bench',    [[1,7,6,null,71],[1,7,8,null,77],[1,7,null,null,71],[2,7,null,null,66]]),
          metaExI('ipl1_w3d2b','B','Deadlift',           'deadlift', [[1,3,5,null,79],[1,3,7,null,85],[1,3,9,null,90]]),
          metaExI('ipl1_w3d2c','C','Halt Deadlift',      'deadlift', [[1,3,6,null,75],[1,3,8,null,80],[1,3,6,null,77]]),
        ],
      },
      {
        label: 'Week 3 Day 3 — Squat / Bench / Deadlift (Heavy)',
        exercises: [
          metaExI('ipl1_w3d3a','A','Squat',              'squat',    [[1,1,6,null,86],[1,1,8,null,93],[1,1,9,null,97],[1,7,8,null,77],[1,7,null,null,69]]),
          metaExI('ipl1_w3d3b','B','Bench',              'bench',    [[1,1,6,null,86],[1,1,8,null,93],[1,1,9,null,97],[2,5,8,null,82]]),
          metaExI('ipl1_w3d3c','C','Deadlift',           'deadlift', [[1,1,6,null,86],[1,1,8,null,93],[1,1,9,null,97],[3,5,6,null,77]]),
        ],
      },
    ],
    // Week 4
    [
      {
        label: 'Week 4 Day 1 — Squat / Tempo Squat / Pause Bench',
        exercises: [
          metaExI('ipl1_w4d1a','A','Squat',              'squat',    [[1,3,5,null,79],[1,3,7,null,85],[1,3,6,null,81]]),
          metaExI('ipl1_w4d1b','B','Tempo 3:1:3 Squat', 'squat',    [[2,5,7,null,77]]),
          metaExI('ipl1_w4d1c','C','2ct Pause Bench',    'bench',    [[1,3,6,null,82],[1,3,8,null,87],[1,3,null,null,79],[1,3,null,null,75]]),
        ],
      },
      {
        label: 'Week 4 Day 2 — Bench / Deadlift / Halt Deadlift',
        exercises: [
          metaExI('ipl1_w4d2a','A','Bench',              'bench',    [[1,7,6,null,71],[1,7,8,null,77],[1,7,null,null,71],[2,7,null,null,66]]),
          metaExI('ipl1_w4d2b','B','Deadlift',           'deadlift', [[1,3,5,null,79],[1,3,7,null,84]]),
          metaExI('ipl1_w4d2c','C','Halt Deadlift',      'deadlift', [[2,3,6,null,75]]),
        ],
      },
      {
        label: 'Week 4 Day 3 — Squat / Bench / Deadlift (Max)',
        exercises: [
          metaExI('ipl1_w4d3a','A','Squat',              'squat',    [[1,1,6,null,86],[1,1,8,null,93],[1,1,10,null,100],[1,7,7,null,74]]),
          metaExI('ipl1_w4d3b','B','Bench',              'bench',    [[1,1,7,null,90],[1,1,9,null,96],[1,1,10,null,100],[2,5,7,null,79]]),
          metaExI('ipl1_w4d3c','C','Deadlift',           'deadlift', [[1,1,6,null,86],[1,1,8,null,93],[1,1,10,null,100],[3,5,6,null,77]]),
        ],
      },
    ],
    // Week 5 — Deload / Hypertrophy
    [
      {
        label: 'Week 5 Day 1 — Squat / High Bar / Pause Bench',
        exercises: [
          metaExI('ipl1_w5d1a','A','Squat',              'squat',    [[1,6,5,null,70],[2,6,6,null,73]]),
          metaExI('ipl1_w5d1b','B','High Bar Squat',     'squat',    [[1,8,5,null,65],[1,8,7,null,69],[1,8,6,null,67]]),
          metaExI('ipl1_w5d1c','C','2ct Pause Bench',    'bench',    [[1,6,5,null,70],[2,6,7,null,74],[1,6,null,null,69]]),
        ],
      },
      {
        label: 'Week 5 Day 2 — Bench / Deadlift',
        exercises: [
          metaExI('ipl1_w5d2a','A','Bench',              'bench',    [[1,10,5,null,60],[1,10,8,null,69],[2,10,null,null,61]]),
          metaExI('ipl1_w5d2b','B','Deadlift',           'deadlift', [[1,2,5,null,80],[1,2,7,null,85],[1,2,5,null,80]]),
        ],
      },
      {
        label: 'Week 5 Day 3 — Squat / Bench / Deadlift (Volume)',
        exercises: [
          metaExI('ipl1_w5d3a','A','Squat',              'squat',    [[1,4,5,null,76],[1,4,7,null,82],[1,8,8,null,70]]),
          metaExI('ipl1_w5d3b','B','Bench',              'bench',    [[1,4,6,null,79],[1,4,8,null,84],[2,8,7,null,70]]),
          metaExI('ipl1_w5d3c','C','Deadlift',           'deadlift', [[1,4,5,null,76],[1,4,7,null,82],[1,4,null,null,75],[1,8,7,null,70]]),
        ],
      },
    ],
  ];
  // Mon / Rest / Wed / Rest / Fri / Rest / Rest
  return flattenWeeks(W, [0, null, 1, null, 2, null, null]);
}

// ── Intermediate Powerlifting Level 2 ────────────────────────────────────────
// 6 weeks × 4 days (Mon/Tue/Thu/Fri).
function buildIPL2Days(): WorkoutDay[] {
  const W: Array<Array<{ label: string; exercises: Exercise[] }>> = [
    // Week 1
    [
      {
        label: 'Week 1 Day 1 — Squat / Pause Bench',
        exercises: [
          metaExI('ipl2_w1d1a','A','Squat',              'squat',    [[1,4,6,null,79],[1,4,8,null,84],[1,4,7,null,81],[1,4,6,null,79]]),
          metaExI('ipl2_w1d1b','B','2ct Pause Bench',    'bench',    [[1,4,6,null,79],[2,4,8,null,84],[1,4,null,null,81]]),
        ],
      },
      {
        label: 'Week 1 Day 2 — Close Grip / Deadlift / Halt Deadlift',
        exercises: [
          metaExI('ipl2_w1d2a','A','Close Grip Bench',   'bench',    [[1,6,5,null,71],[3,6,7,null,77]]),
          metaExI('ipl2_w1d2b','B','Deadlift',           'deadlift', [[1,4,6,null,79],[1,4,8,null,84],[1,4,5,null,78]]),
          metaExI('ipl2_w1d2c','C','Halt Deadlift',      'deadlift', [[1,3,5,null,77],[2,3,7,null,82]]),
        ],
      },
      {
        label: 'Week 1 Day 3 — Tempo Squat / High Bar / Bench',
        exercises: [
          metaExI('ipl2_w1d3a','A','Tempo 3:1:3 Squat', 'squat',    [[1,5,5,null,71],[1,5,6,null,74],[1,5,7,null,77]]),
          metaExI('ipl2_w1d3b','B','High Bar Squat',     'squat',    [[1,8,5,null,65],[1,8,7,null,70],[1,8,8,null,73]]),
          metaExI('ipl2_w1d3c','C','Bench',              'bench',    [[1,1,5,null,84],[1,1,7,null,90],[3,8,7,null,70]]),
        ],
      },
      {
        label: 'Week 1 Day 4 — Squat / Bench / Pause Bench / Deadlift',
        exercises: [
          metaExI('ipl2_w1d4a','A','Squat',              'squat',    [[1,1,5,null,84],[1,1,7,null,90],[1,1,6,null,87],[1,6,7,null,77]]),
          metaExI('ipl2_w1d4b','B','Bench',              'bench',    [[1,1,5,null,86],[1,1,7,null,90],[1,1,8,null,93]]),
          metaExI('ipl2_w1d4c','C','3ct Pause Bench',    'bench',    [[3,3,7,null,84]]),
          metaExI('ipl2_w1d4d','D','Deadlift',           'deadlift', [[1,1,5,null,84],[1,1,7,null,90],[1,5,8,null,82],[1,5,null,null,77],[1,5,null,null,73]]),
        ],
      },
    ],
    // Week 2
    [
      {
        label: 'Week 2 Day 1 — Squat / Pause Bench',
        exercises: [
          metaExI('ipl2_w2d1a','A','Squat',              'squat',    [[1,4,6,null,79],[1,4,8,null,84],[2,4,7,null,81]]),
          metaExI('ipl2_w2d1b','B','2ct Pause Bench',    'bench',    [[1,4,6,null,79],[2,4,8,null,84],[1,4,7,null,81]]),
        ],
      },
      {
        label: 'Week 2 Day 2 — Close Grip / Deadlift / Halt Deadlift',
        exercises: [
          metaExI('ipl2_w2d2a','A','Close Grip Bench',   'bench',    [[1,6,5,null,71],[3,6,7,null,77]]),
          metaExI('ipl2_w2d2b','B','Deadlift',           'deadlift', [[1,4,6,null,79],[1,4,8,null,84],[1,4,5,null,78]]),
          metaExI('ipl2_w2d2c','C','Halt Deadlift',      'deadlift', [[1,3,5,null,77],[2,3,7,null,82]]),
        ],
      },
      {
        label: 'Week 2 Day 3 — Tempo Squat / High Bar / Bench',
        exercises: [
          metaExI('ipl2_w2d3a','A','Tempo 3:1:3 Squat', 'squat',    [[1,5,5,null,71],[1,5,6,null,74],[1,5,7,null,77]]),
          metaExI('ipl2_w2d3b','B','High Bar Squat',     'squat',    [[1,8,5,null,65],[1,8,7,null,70],[1,8,8,null,73]]),
          metaExI('ipl2_w2d3c','C','Bench',              'bench',    [[1,1,5,null,84],[1,1,7,null,90],[3,8,7,null,70]]),
        ],
      },
      {
        label: 'Week 2 Day 4 — Squat / Bench / Pause Bench / Deadlift',
        exercises: [
          metaExI('ipl2_w2d4a','A','Squat',              'squat',    [[1,1,5,null,84],[1,1,7,null,90],[1,1,8,null,93],[1,6,7,null,77]]),
          metaExI('ipl2_w2d4b','B','Bench',              'bench',    [[1,1,5,null,86],[1,1,7,null,90],[1,1,8,null,93]]),
          metaExI('ipl2_w2d4c','C','3ct Pause Bench',    'bench',    [[3,3,7,null,84]]),
          metaExI('ipl2_w2d4d','D','Deadlift',           'deadlift', [[1,1,6,null,87],[1,1,8,null,93],[1,5,8,null,82],[2,5,null,null,77]]),
        ],
      },
    ],
    // Week 3
    [
      {
        label: 'Week 3 Day 1 — Squat / Pause Bench',
        exercises: [
          metaExI('ipl2_w3d1a','A','Squat',              'squat',    [[1,3,6,null,82],[1,3,8,null,87],[1,3,7,null,84],[1,3,null,null,78]]),
          metaExI('ipl2_w3d1b','B','2ct Pause Bench',    'bench',    [[1,4,6,null,79],[2,4,8,null,84],[1,4,7,null,81]]),
        ],
      },
      {
        label: 'Week 3 Day 2 — Close Grip / Deadlift / Halt Deadlift',
        exercises: [
          metaExI('ipl2_w3d2a','A','Close Grip Bench',   'bench',    [[1,6,5,null,71],[3,6,7,null,77]]),
          metaExI('ipl2_w3d2b','B','Deadlift',           'deadlift', [[1,3,5,null,79],[1,3,7,null,84],[2,3,8,null,88]]),
          metaExI('ipl2_w3d2c','C','Halt Deadlift',      'deadlift', [[1,3,5,null,77],[2,3,7,null,82]]),
        ],
      },
      {
        label: 'Week 3 Day 3 — Tempo Squat / High Bar / Bench',
        exercises: [
          metaExI('ipl2_w3d3a','A','Tempo 3:1:3 Squat', 'squat',    [[1,5,5,null,71],[1,5,7,null,77],[1,5,8,null,80]]),
          metaExI('ipl2_w3d3b','B','High Bar Squat',     'squat',    [[3,6,6,null,74]]),
          metaExI('ipl2_w3d3c','C','Bench',              'bench',    [[1,1,5,null,84],[1,1,7,null,90],[3,8,7,null,70]]),
        ],
      },
      {
        label: 'Week 3 Day 4 — Squat / Bench / Pause Bench / Deadlift',
        exercises: [
          metaExI('ipl2_w3d4a','A','Squat',              'squat',    [[1,1,6,null,87],[2,1,7,null,90],[1,6,7,null,77]]),
          metaExI('ipl2_w3d4b','B','Bench',              'bench',    [[1,1,7,null,90],[1,1,8,null,93],[1,1,9,null,97]]),
          metaExI('ipl2_w3d4c','C','3ct Pause Bench',    'bench',    [[3,3,7,null,84]]),
          metaExI('ipl2_w3d4d','D','Deadlift',           'deadlift', [[1,1,6,null,87],[1,1,8,null,93],[2,5,8,null,82],[1,5,null,null,71]]),
        ],
      },
    ],
    // Week 4
    [
      {
        label: 'Week 4 Day 1 — Squat / Pause Bench',
        exercises: [
          metaExI('ipl2_w4d1a','A','Squat',              'squat',    [[1,3,5,null,79],[1,3,7,null,84],[2,3,8,null,88],[1,3,null,null,76]]),
          metaExI('ipl2_w4d1b','B','2ct Pause Bench',    'bench',    [[1,4,6,null,79],[2,4,8,null,84],[1,4,7,null,81]]),
        ],
      },
      {
        label: 'Week 4 Day 2 — Close Grip / Deadlift / Halt Deadlift',
        exercises: [
          metaExI('ipl2_w4d2a','A','Close Grip Bench',   'bench',    [[1,6,5,null,71],[3,6,7,null,77]]),
          metaExI('ipl2_w4d2b','B','Deadlift',           'deadlift', [[1,3,5,null,79],[1,3,7,null,85],[2,3,8,null,88]]),
          metaExI('ipl2_w4d2c','C','Halt Deadlift',      'deadlift', [[3,3,5,null,77]]),
        ],
      },
      {
        label: 'Week 4 Day 3 — Tempo Squat / High Bar / Bench',
        exercises: [
          metaExI('ipl2_w4d3a','A','Tempo 3:1:3 Squat', 'squat',    [[1,5,5,null,71],[1,5,7,null,77],[1,5,8,null,80]]),
          metaExI('ipl2_w4d3b','B','High Bar Squat',     'squat',    [[3,6,6,null,74]]),
          metaExI('ipl2_w4d3c','C','Bench',              'bench',    [[1,1,5,null,84],[1,1,7,null,90],[3,8,7,null,70]]),
        ],
      },
      {
        label: 'Week 4 Day 4 — Squat / Bench / Pause Bench / Deadlift',
        exercises: [
          metaExI('ipl2_w4d4a','A','Squat',              'squat',    [[1,1,7,null,90],[1,1,8,null,93],[1,1,9,null,97],[1,6,7,null,77]]),
          metaExI('ipl2_w4d4b','B','Bench',              'bench',    [[1,1,7,null,90],[1,1,8,null,93],[1,1,7,null,90]]),
          metaExI('ipl2_w4d4c','C','3ct Pause Bench',    'bench',    [[3,3,7,null,84]]),
          metaExI('ipl2_w4d4d','D','Deadlift',           'deadlift', [[1,1,7,null,90],[1,1,9,null,97],[2,5,7,null,77]]),
        ],
      },
    ],
    // Week 5
    [
      {
        label: 'Week 5 Day 1 — Squat / Pause Bench',
        exercises: [
          metaExI('ipl2_w5d1a','A','Squat',              'squat',    [[1,3,5,null,79],[1,3,7,null,84],[1,3,null,null,78]]),
          metaExI('ipl2_w5d1b','B','2ct Pause Bench',    'bench',    [[1,4,6,null,79],[1,4,8,null,84],[1,4,null,null,78]]),
        ],
      },
      {
        label: 'Week 5 Day 2 — Close Grip / Deadlift',
        exercises: [
          metaExI('ipl2_w5d2a','A','Close Grip Bench',   'bench',    [[1,6,5,null,71],[2,6,6,null,74]]),
          metaExI('ipl2_w5d2b','B','Deadlift',           'deadlift', [[1,3,5,null,79],[2,3,6,null,81]]),
        ],
      },
      {
        label: 'Week 5 Day 3 — Tempo Squat / Bench',
        exercises: [
          metaExI('ipl2_w5d3a','A','Tempo 3:1:3 Squat', 'squat',    [[1,5,5,null,71],[2,5,6,null,74]]),
          metaExI('ipl2_w5d3b','B','Bench',              'bench',    [[1,1,5,null,84],[2,8,6,null,68]]),
        ],
      },
      {
        label: 'Week 5 Day 4 — Squat / Bench / Deadlift (Max)',
        exercises: [
          metaExI('ipl2_w5d4a','A','Squat',              'squat',    [[1,1,6,null,87],[1,1,8,null,93],[1,1,10,null,100]]),
          metaExI('ipl2_w5d4b','B','Bench',              'bench',    [[1,1,8,null,93],[1,1,9,null,97],[1,1,10,null,100]]),
          metaExI('ipl2_w5d4c','C','Deadlift',           'deadlift', [[1,1,6,null,87],[1,1,8,null,93],[1,1,10,null,100]]),
        ],
      },
    ],
    // Week 6
    [
      {
        label: 'Week 6 Day 1 — Squat / Pause Bench',
        exercises: [
          metaExI('ipl2_w6d1a','A','Squat',              'squat',    [[1,9,5,null,63],[1,9,6,null,66],[1,9,7,null,69],[1,9,null,null,61]]),
          metaExI('ipl2_w6d1b','B','2ct Pause Bench',    'bench',    [[1,6,5,null,71],[1,6,7,null,77],[1,6,8,null,80],[1,6,6,null,74]]),
        ],
      },
      {
        label: 'Week 6 Day 2 — Close Grip / Dumbbell Bench / Deadlift',
        exercises: [
          metaExI('ipl2_w6d2a','A','Close Grip Bench',   'bench',    [[1,9,5,null,63],[1,9,7,null,69],[1,9,9,null,74]]),
          metaExI('ipl2_w6d2b','B','Dumbbell Bench',     null,       [[1,8,5,null,null],[1,8,7,null,null],[2,8,8,null,null]]),
          metaExI('ipl2_w6d2c','C','Deadlift',           'deadlift', [[1,7,5,null,69],[1,7,6,null,72],[2,7,7,null,75]]),
        ],
      },
      {
        label: 'Week 6 Day 3 — High Bar / Squat / Bench',
        exercises: [
          metaExI('ipl2_w6d3a','A','High Bar Squat',     'squat',    [[1,3,5,null,79],[1,3,6,null,81],[1,3,7,null,83]]),
          metaExI('ipl2_w6d3b','B','Squat',              'squat',    [[2,5,5,null,74]]),
          metaExI('ipl2_w6d3c','C','Bench',              'bench',    [[3,1,6,null,87],[1,10,9,null,70]]),
        ],
      },
      {
        label: 'Week 6 Day 4 — Squat / Bench / Deadlift (Volume)',
        exercises: [
          metaExI('ipl2_w6d4a','A','Squat',              'squat',    [[1,4,5,null,77],[1,4,6,null,80],[1,4,7,null,82]]),
          metaExI('ipl2_w6d4b','B','Bench',              'bench',    [[1,4,5,null,77],[1,4,6,null,80],[2,4,7,null,82]]),
          metaExI('ipl2_w6d4c','C','Deadlift',           'deadlift', [[1,4,5,null,77],[1,4,6,null,80],[1,4,7,null,82],[1,4,null,null,75]]),
        ],
      },
    ],
  ];
  // Mon / Tue / Rest / Thu / Fri / Rest / Rest
  return flattenWeeks(W, [0, 1, null, 2, 3, null, null]);
}

// ── Professional Deadlift Special ────────────────────────────────────────────
// 5 weeks × 2 days (Mon/Fri). All exercises deadlift-based.
function buildPDLSDays(): WorkoutDay[] {
  const W: Array<Array<{ label: string; exercises: Exercise[] }>> = [
    // Week 1
    [
      {
        label: 'Week 1 Day 1 — Halt Deadlift / Deadlift / Row',
        exercises: [
          metaExI('pdls_w1d1a','A','Halt Deadlift',           'deadlift', [[1,5,5,null,84],[1,1,7,null,88],[1,1,6,null,86]]),
          metaExI('pdls_w1d1b','B','Deadlift',                'deadlift', [[1,5,6,null,77],[2,5,8,null,82],[1,5,6,null,77]]),
          metaExI('pdls_w1d1c','C','Dumbbell Bent Over Row',  null,       [[1,8,5,null,null],[1,8,7,null,null],[3,8,9,null,null]]),
        ],
      },
      {
        label: 'Week 1 Day 2 — Deadlift / Eccentric Deadlift',
        exercises: [
          metaExI('pdls_w1d2a','A','Deadlift',                'deadlift', [[1,3,6,null,82],[1,3,8,null,87],[2,3,null,null,78]]),
          metaExI('pdls_w1d2b','B','Eccentric 3sec Deadlift', 'deadlift', [[3,4,5,null,70]]),
        ],
      },
    ],
    // Week 2
    [
      {
        label: 'Week 2 Day 1 — Halt Deadlift / Deadlift / Row',
        exercises: [
          metaExI('pdls_w2d1a','A','Halt Deadlift',           'deadlift', [[1,1,6,null,86],[1,1,8,null,92],[1,1,6,null,86]]),
          metaExI('pdls_w2d1b','B','Deadlift',                'deadlift', [[1,5,6,null,77],[2,5,8,null,82],[1,5,null,null,73]]),
          metaExI('pdls_w2d1c','C','Dumbbell Bent Over Row',  null,       [[1,8,5,null,null],[1,8,7,null,null],[3,8,9,null,null]]),
        ],
      },
      {
        label: 'Week 2 Day 2 — Deadlift / Eccentric Deadlift',
        exercises: [
          metaExI('pdls_w2d2a','A','Deadlift',                'deadlift', [[1,3,6,null,82],[1,3,8,null,87],[2,3,null,null,78],[1,3,null,null,73]]),
          metaExI('pdls_w2d2b','B','Eccentric 3sec Deadlift', 'deadlift', [[3,4,5,null,70]]),
        ],
      },
    ],
    // Week 3
    [
      {
        label: 'Week 3 Day 1 — Halt Deadlift / Deadlift / Row',
        exercises: [
          metaExI('pdls_w3d1a','A','Halt Deadlift',           'deadlift', [[1,1,6,null,86],[1,1,8,null,92],[1,1,7,null,88]]),
          metaExI('pdls_w3d1b','B','Deadlift',                'deadlift', [[1,5,6,null,77],[2,5,8,null,82],[1,5,null,null,73],[1,5,null,null,69]]),
          metaExI('pdls_w3d1c','C','Dumbbell Bent Over Row',  null,       [[1,8,5,null,null],[1,8,7,null,null],[3,8,9,null,null]]),
        ],
      },
      {
        label: 'Week 3 Day 2 — Deadlift / Eccentric Deadlift',
        exercises: [
          metaExI('pdls_w3d2a','A','Deadlift',                'deadlift', [[1,3,5,null,79],[1,3,7,null,86],[1,3,9,null,92],[2,3,null,null,80],[1,3,null,null,76]]),
          metaExI('pdls_w3d2b','B','Eccentric 3sec Deadlift', 'deadlift', [[3,4,5,null,70]]),
        ],
      },
    ],
    // Week 4
    [
      {
        label: 'Week 4 Day 1 — Halt Deadlift / Deadlift',
        exercises: [
          metaExI('pdls_w4d1a','A','Halt Deadlift',           'deadlift', [[2,1,6,null,86],[1,1,5,null,83]]),
          metaExI('pdls_w4d1b','B','Deadlift',                'deadlift', [[1,5,5,null,74],[2,5,7,null,79]]),
        ],
      },
      {
        label: 'Week 4 Day 2 — Deadlift (Heavy) / Eccentric Deadlift',
        exercises: [
          metaExI('pdls_w4d2a','A','Deadlift',                'deadlift', [[1,1,6,null,87],[1,1,8,null,93],[1,1,9,null,97]]),
          metaExI('pdls_w4d2b','B','Eccentric 3sec Deadlift', 'deadlift', [[3,4,5,null,70]]),
        ],
      },
    ],
    // Week 5
    [
      {
        label: 'Week 5 Day 1 — Halt Deadlift / Deadlift',
        exercises: [
          metaExI('pdls_w5d1a','A','Halt Deadlift',           'deadlift', [[1,3,5,null,79],[1,3,7,null,84],[1,3,6,null,81]]),
          metaExI('pdls_w5d1b','B','Deadlift',                'deadlift', [[3,5,5,null,74]]),
        ],
      },
      {
        label: 'Week 5 Day 2 — Deadlift (Volume) / Eccentric Deadlift',
        exercises: [
          metaExI('pdls_w5d2a','A','Deadlift',                'deadlift', [[1,1,6,null,83],[1,7,8,null,75],[1,7,null,null,67],[1,7,null,null,63]]),
          metaExI('pdls_w5d2b','B','Eccentric 3sec Deadlift', 'deadlift', [[3,4,5,null,70]]),
        ],
      },
    ],
  ];
  // Mon / Rest / Rest / Rest / Fri / Rest / Rest
  return flattenWeeks(W, [0, null, null, null, 1, null, null]);
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
  {
    id: 'plan-beg-pl1',
    level: 'beginner',
    name: 'Beginner Powerlifting Level 1',
    durationWeeks: 6,
    description:
      'A 6-week introduction to powerlifting. Three sessions per week focusing on squat, bench, and deadlift with structured RPE and intensity targets calculated from your 1RM PRs.',
    days: buildBPL1Days(),
    defaultWeeklySchedule: [1, 3, 5], // Mon / Wed / Fri
  },
  {
    id: 'plan-int-power',
    level: 'intermediate',
    name: 'Intermediate Power',
    durationWeeks: 5,
    description:
      'A 5-week intermediate program with 4 sessions per week. Builds strength across all three powerlifting movements through progressive loading, peaking with a max-attempt day and a hypertrophy-focused final week.',
    days: buildIPDays(),
    defaultWeeklySchedule: [1, 2, 4, 5], // Mon / Tue / Thu / Fri
  },
  {
    id: 'plan-int-pl1',
    level: 'intermediate',
    name: 'Intermediate Powerlifting Level 1',
    durationWeeks: 5,
    description:
      'A 5-week intermediate powerlifting cycle with 3 days per week. Combines main lifts with tempo squats and halt deadlifts to build technical efficiency alongside absolute strength.',
    days: buildIPL1Days(),
    defaultWeeklySchedule: [1, 3, 5], // Mon / Wed / Fri
  },
  {
    id: 'plan-int-pl2',
    level: 'intermediate',
    name: 'Intermediate Powerlifting Level 2',
    durationWeeks: 6,
    description:
      'A 6-week advanced intermediate program with 4 sessions per week. High-frequency squat, bench, and deadlift training with pause variations and tempo work, culminating in a max-attempt week.',
    days: buildIPL2Days(),
    defaultWeeklySchedule: [1, 2, 4, 5], // Mon / Tue / Thu / Fri
  },
  {
    id: 'plan-pro-dl-special',
    level: 'professional',
    name: 'Professional Deadlift Special',
    durationWeeks: 5,
    description:
      'A 5-week specialist deadlift program with 2 focused sessions per week. Combines halt deadlifts, eccentric-focused pulls, and heavy singles to drive deadlift-specific strength gains.',
    days: buildPDLSDays(),
    defaultWeeklySchedule: [1, 5], // Mon / Fri
  },
];
