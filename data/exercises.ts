export interface Exercise {
  id: string;
  name: string;
  youtubeId: string;
  description: string;
  muscleGroups: string[];
  steps: string[];
  tips: string[];
}

export const exercises: Exercise[] = [
  {
    id: 'bench-press',
    name: 'Bench Press',
    youtubeId: '',
    description:
      'A compound upper-body push movement targeting the chest, shoulders, and triceps.',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    steps: [
      'Lie flat on the bench with your eyes directly under the bar.',
      'Grip the bar slightly wider than shoulder-width, thumbs wrapped around the bar.',
      'Retract and depress your shoulder blades; create a slight arch in your lower back.',
      'Unrack the bar and position it over your lower chest.',
      'Lower the bar in a controlled arc to your sternum / nipple line.',
      'Drive the bar back up and slightly toward the rack until arms are fully extended.',
    ],
    tips: [
      'Keep feet flat on the floor and use leg drive throughout the press.',
      'The bar should lightly touch your chest on each rep — no bouncing.',
      'Squeeze your glutes to maintain a stable, tight base.',
      'Keep wrists straight and directly above elbows at the bottom position.',
    ],
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    youtubeId: '',
    description:
      'The king of compound lifts — trains the entire posterior chain including hamstrings, glutes, and lower back.',
    muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back', 'Traps'],
    steps: [
      'Stand with feet hip-width apart, bar positioned over your mid-foot.',
      'Hinge at the hips and bend your knees until your shins touch the bar.',
      'Grip just outside your legs (double overhand or alternating grip).',
      'Take a deep breath and brace your core 360° around your spine.',
      'Push the floor away — do not jerk the bar upward.',
      'Keep the bar dragging close to your shins and thighs throughout the pull.',
      'Lock out at the top: hips fully extended, glutes squeezed, shoulders stacked over hips.',
    ],
    tips: [
      'Never round your lower back — think "chest up, hips down" before you pull.',
      'Think of it as a leg press against the floor, not a back pull.',
      'Reset your position fully between reps when doing heavy singles.',
      'Engage your lats by thinking "protect your armpits" before initiating the pull.',
    ],
  },
  {
    id: 'squat',
    name: 'Squat',
    youtubeId: '',
    description:
      'A fundamental lower-body compound movement that builds strength and muscle throughout the legs and core.',
    muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    steps: [
      'Position the bar across your upper traps (high bar) or rear delts (low bar).',
      'Stand with feet shoulder-width apart, toes angled out 15–30°.',
      'Brace your core, take a deep breath, unrack, and step back into your stance.',
      'Break at the hips and knees simultaneously — sit back and down.',
      'Descend until your thighs are at least parallel to the floor.',
      'Drive up through your entire foot, keeping knees tracking over your toes.',
    ],
    tips: [
      'Keep your chest up and spine neutral throughout the entire movement.',
      'Push your knees out in the direction of your toes — never let them cave in.',
      'Control the descent; avoid collapsing at the bottom.',
      'Take your breath at the top of each rep before descending.',
    ],
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    youtubeId: '',
    description:
      'A standing barbell press that builds shoulder strength and upper-body stability.',
    muscleGroups: ['Shoulders', 'Triceps', 'Upper Chest', 'Core'],
    steps: [
      'Stand with feet hip-width apart, bar resting on your front delts, hands just outside shoulder-width.',
      'Brace your core and squeeze your glutes to create a stable base.',
      'Press the bar straight up, moving your head slightly back to clear it.',
      'Once the bar passes your forehead, push your head forward and continue pressing.',
      'Lock out fully with arms extended and bar over your mid-foot.',
      'Lower under control back to the starting position on your front delts.',
    ],
    tips: [
      'Avoid excessive lower-back arch — keep ribs down and core braced.',
      'Squeeze the bar hard and think about pushing yourself away from it.',
      'The bar path should be as vertical as possible.',
      'Take air at the bottom and press out of a solid brace.',
    ],
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    youtubeId: '',
    description:
      'A bodyweight vertical pulling exercise that builds the lats, biceps, and upper back.',
    muscleGroups: ['Lats', 'Biceps', 'Upper Back'],
    steps: [
      'Hang from the bar with an overhand grip slightly wider than shoulder-width.',
      'Depress and retract your shoulder blades before you pull.',
      'Drive your elbows down and back to initiate the movement.',
      'Pull until your chin clears the bar.',
      'Lower yourself under control to a full hang.',
    ],
    tips: [
      'Avoid kipping — controlled reps build more strength and muscle.',
      'Think "elbows to hips" rather than "pull with hands".',
      'Full dead hang at the bottom maximises range of motion.',
      'Add weight with a belt once bodyweight reps exceed 10–12.',
    ],
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    youtubeId: '',
    description:
      'A horizontal pulling movement that targets the upper back, lats, and rear deltoids.',
    muscleGroups: ['Upper Back', 'Lats', 'Rear Delts', 'Biceps'],
    steps: [
      'Stand with feet hip-width, hinge at hips until torso is roughly 45° to horizontal.',
      'Grip the bar just outside shoulder-width with an overhand grip.',
      'Brace your core and keep a neutral spine throughout.',
      'Pull the bar to your lower chest / upper abdomen, leading with your elbows.',
      'Squeeze your shoulder blades together at the top.',
      'Lower the bar under control back to arms-extended.',
    ],
    tips: [
      'Do not use excessive momentum — limit lower-back swing.',
      'Keep your head neutral, not craned up.',
      'A slight knee bend helps protect the lower back.',
      'Row to your belly button for more lat engagement; to your lower chest for more upper back.',
    ],
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    youtubeId: '',
    description:
      'A unilateral horizontal pull that corrects imbalances and builds lat thickness.',
    muscleGroups: ['Lats', 'Upper Back', 'Biceps'],
    steps: [
      'Place one knee and same-side hand on a bench for support.',
      'Hold a dumbbell with the other hand, arm hanging straight down.',
      'Keep a flat back and neutral spine.',
      'Pull the dumbbell to your hip, driving your elbow behind you.',
      'Squeeze at the top, then lower under control.',
    ],
    tips: [
      'Keep hips square — avoid rotating your torso to use momentum.',
      'Think about driving your elbow up rather than lifting with your hand.',
      'Full stretch at the bottom for maximum lat recruitment.',
    ],
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    youtubeId: '',
    description:
      'A machine-based quad-dominant push that allows heavy loading with reduced spinal compression.',
    muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
    steps: [
      'Sit in the machine with your back and hips flat against the pad.',
      'Place feet hip-width apart at mid-height on the platform.',
      'Release the safety handles and lower the platform under control.',
      'Lower until your knees reach roughly 90°, then drive through your heels.',
      'Extend to just short of lockout, maintaining tension on the muscles.',
      'Re-engage the safety handles at the end of your set.',
    ],
    tips: [
      'Do not let your lower back peel off the pad at the bottom — reduce range if it does.',
      'Avoid locking out forcefully — keep tension on quads throughout.',
      'Foot position higher = more glute/ham; lower = more quad.',
    ],
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    youtubeId: '',
    description:
      'A hip-hinge movement that isolates the hamstrings and glutes through a large range of motion.',
    muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back'],
    steps: [
      'Stand holding the bar at hip height with an overhand grip.',
      'Push your hips back while keeping a slight bend in your knees.',
      'Lower the bar along your legs, keeping it close to your shins.',
      'Hinge until you feel a strong stretch in your hamstrings.',
      'Drive hips forward to return to standing, squeezing glutes at the top.',
    ],
    tips: [
      'Do not round your lower back — maintain neutral spine throughout.',
      'The movement is driven by hips going back, not knees bending down.',
      'Bar stays in contact with legs the whole way.',
      'Stop at the point of maximum hamstring stretch — not the floor.',
    ],
  },
  {
    id: 'bicep-curl',
    name: 'Bicep Curl',
    youtubeId: '',
    description:
      'An isolation movement for the biceps brachii using a barbell or dumbbells.',
    muscleGroups: ['Biceps', 'Forearms'],
    steps: [
      'Stand with feet shoulder-width, holding a barbell or dumbbells with an underhand grip.',
      'Pin your elbows to your sides throughout the movement.',
      'Curl the weight up toward your shoulders by flexing at the elbow.',
      'Squeeze your biceps at the top of the movement.',
      'Lower under control to full extension.',
    ],
    tips: [
      'Avoid swinging your torso — isolate the elbow joint.',
      'Full extension at the bottom keeps constant tension on the biceps.',
      'Supinate your wrist (turn palm outward) at the top for peak contraction.',
    ],
  },
  {
    id: 'triceps-pushdown',
    name: 'Triceps Pushdown',
    youtubeId: '',
    description:
      'A cable isolation exercise that targets all three heads of the triceps.',
    muscleGroups: ['Triceps'],
    steps: [
      'Attach a straight bar or rope to a high pulley.',
      'Stand facing the cable, gripping the attachment with an overhand grip.',
      'Tuck your elbows to your sides and keep them stationary.',
      'Extend your forearms downward until arms are straight.',
      'Squeeze triceps at the bottom, then return under control.',
    ],
    tips: [
      'Keep a slight forward lean — do not stand completely upright.',
      'Elbows must not flare or drift forward during the movement.',
      'For the rope: spread the handles apart at the bottom for extra squeeze.',
    ],
  },
  {
    id: 'overhead-triceps-extension',
    name: 'Overhead Triceps Extension',
    youtubeId: '',
    description:
      'A dumbbell or cable overhead movement that stretches and trains the long head of the triceps.',
    muscleGroups: ['Triceps'],
    steps: [
      'Hold a dumbbell with both hands overhead, palms pressing against the inner plate.',
      'Keep upper arms close to your ears and elbows pointed forward.',
      'Lower the dumbbell behind your head by bending at the elbows.',
      'Press back up to full extension.',
    ],
    tips: [
      'Keep upper arms vertical throughout — only the forearms move.',
      'The overhead position stretches the long head of the triceps for maximum growth.',
      'Control the eccentric — avoid letting the weight crash down.',
    ],
  },
  {
    id: 'dumbbell-lateral-raise',
    name: 'Lateral Raise',
    youtubeId: '',
    description:
      'An isolation movement for the medial deltoid that adds shoulder width.',
    muscleGroups: ['Shoulders'],
    steps: [
      'Stand holding dumbbells at your sides with a slight bend in the elbows.',
      'Raise the dumbbells out to the sides until they reach shoulder height.',
      'Lead with your elbows, not your hands.',
      'Lower under control back to your sides.',
    ],
    tips: [
      'Slight forward lean increases medial delt activation.',
      'Avoid shrugging your traps — keep shoulders down.',
      'Go lighter than you think — form breaks quickly on this movement.',
    ],
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    youtubeId: '',
    description:
      'A barbell glute exercise performed with shoulder blades on a bench for maximum hip extension range.',
    muscleGroups: ['Glutes', 'Hamstrings'],
    steps: [
      'Sit on the ground with your upper back against a bench, bar across your hips.',
      'Plant feet flat on the floor, hip-width apart.',
      'Drive through your heels and upper back, extending your hips toward the ceiling.',
      'Squeeze your glutes hard at the top — your body should form a straight line from knees to shoulders.',
      'Lower under control back to the floor.',
    ],
    tips: [
      'Use a barbell pad to protect your hips from the bar.',
      'Drive knees outward at the top to maximize glute activation.',
      'Chin should be tucked — avoid hyperextending the neck.',
    ],
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    youtubeId: '',
    description:
      'A cable exercise for rear deltoids and external rotators that supports shoulder health.',
    muscleGroups: ['Rear Delts', 'Rotator Cuff', 'Upper Back'],
    steps: [
      'Set a cable to upper chest / face height with a rope attachment.',
      'Grip the rope with both hands, thumbs pointing toward you.',
      'Step back to create tension, then pull the rope toward your face.',
      'Split the rope apart as you pull, bringing hands to ear level.',
      'Hold for a moment, then return under control.',
    ],
    tips: [
      'Keep your elbows high — at or above shoulder height.',
      'This movement is light — prioritize quality of external rotation over load.',
      'Great as a warm-up or as a high-rep accessory for shoulder health.',
    ],
  },
];
