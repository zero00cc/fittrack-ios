# FitTrack iOS

A React Native + Expo fitness app for tracking calories, following workout plans, browsing exercise guidance, and logging photos.

## Features

- **Calorie Tracker** — Log daily meals from a 30-item food library, set a daily calorie target, view a 30-day color-coded history chart, and analyze food photos with AI
- **Workout Plans** — Level selector (Beginner / Intermediate / Professional), Meta 5/3/1 powerlifting plan with per-set tracking and auto-finish
- **Exercise Library** — Step-by-step instructions, coaching tips, and YouTube links for Bench Press, Deadlift, and Squat
- **Gallery** — Upload and browse photos of meals and workouts in two separate tabs

## Tech Stack

- React Native + Expo (expo-router, file-based tabs navigation)
- TypeScript
- AsyncStorage — persists all app state locally on device
- expo-file-system — stores gallery images in the app document directory
- expo-image-picker — camera and photo library access
- Anthropic API (claude-haiku) — food photo analysis

## Project Structure

```
fittrack-ios/
├── app/
│   └── (tabs)/
│       ├── _layout.tsx       # Tab bar (5 tabs)
│       ├── index.tsx         # Home screen
│       ├── calories.tsx      # Calorie Tracker
│       ├── workouts.tsx      # Workout Plans
│       ├── exercises.tsx     # Exercise Library
│       └── gallery.tsx       # Gallery
├── components/
│   ├── calorie/
│   │   ├── CalorieHistoryChart.tsx   # 30-day bar chart
│   │   └── SnapTrack.tsx             # Photo analysis
│   └── workout/
│       └── ExerciseCard.tsx          # Set tracking UI
├── hooks/
│   ├── useAsyncStorage.ts    # Generic async storage hook
│   ├── useCalorieStore.ts    # Calorie state + persistence
│   ├── useWorkoutStore.ts    # Workout state + persistence
│   └── useGalleryStore.ts    # Gallery metadata + file management
├── types/                    # TypeScript interfaces
├── data/                     # Foods, exercises, workout plans
└── utils/                    # Date and calorie utilities
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add your Anthropic API key

Create or edit `.env` in the project root:

```
EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...
```

This key is used for food photo analysis. The `.env` file is gitignored.

### 3. Run the app

```bash
npm start
```

Install **Expo Go** on your iPhone, then scan the QR code or enter the URL manually:

```
exp://YOUR_MAC_IP:8081
```

Your iPhone and Mac must be on the same Wi-Fi network.

## Calorie Chart Colors

| Color | Meaning | Threshold (default 2000 kcal target) |
|---|---|---|
| 🔵 Blue | Low intake | Below 1800 kcal (< 90% of target) |
| 🟢 Green | Normal intake | 1800 – 2200 kcal (90–110% of target) |
| 🔴 Red | High intake | Above 2200 kcal (> 110% of target) |

Thresholds scale automatically when the daily target is changed.

## Workout Plans

Currently only **Meta 5/3/1** (Professional level) is active. Future plans can be added to `data/workoutPlans.ts` using the `setBlocks` format.

Set tracking per row:
- `sets = 1` → toggle button (tap to mark done / undo)
- `sets > 1` → counter stepper (−  N/total  +)

When all sets across all exercises in a day are completed, the day is automatically marked finished in the calendar.

## AsyncStorage Keys

| Key | Contents |
|---|---|
| `fittrack_calorie_history` | All daily meal logs keyed by `YYYY-MM-DD` |
| `fittrack_calorie_settings` | `{ dailyTarget: 2000 }` |
| `fittrack_workout_state` | Selected level, active plan, day status, set progress |
| `fittrack_gallery_meta` | Gallery item metadata (URIs, dates, categories) |

Gallery images are saved to the app's document directory under `fittrack_gallery/`.

## Adding More Exercises

Edit `data/exercises.ts` — each entry takes a name, YouTube video ID, muscle groups, steps, and tips:

```ts
{
  id: 'overhead-press',
  name: 'Overhead Press',
  youtubeId: 'YOUR_VIDEO_ID',
  description: '...',
  muscleGroups: ['Shoulders', 'Triceps'],
  steps: ['Step 1...', 'Step 2...'],
  tips: ['Tip 1...'],
}
```
