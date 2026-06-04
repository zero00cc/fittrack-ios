export interface Exercise {
  id: string;
  name: string;
  youtubeId: string; // replace with real YouTube video ID
  description: string;
  muscleGroups: string[];
  steps: string[];
  tips: string[];
}

export const exercises: Exercise[] = [
  {
    id: 'bench-press',
    name: 'Bench Press',
    youtubeId: '', // TODO: add YouTube video ID
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
    youtubeId: '', // TODO: add YouTube video ID
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
    youtubeId: '', // TODO: add YouTube video ID
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
];
