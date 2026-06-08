# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

**Expo v56 has breaking changes.** Always read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing Expo-specific code. In particular, `expo-file-system` v56 moved legacy APIs to `expo-file-system/legacy`.

## Commands

```bash
npm install                              # install dependencies (first time)
npx expo start                           # dev server — scan QR in Expo Go
npx expo start --ios                     # open iOS simulator directly
npx expo start --android                 # open Android emulator directly
npx expo start --web                     # open in browser (react-native-web)
CI=1 npx expo start --web --port 19006  # non-interactive browser mode

# Type checking (no test suite exists)
npx tsc --noEmit
```

## Environment variables

Create a `.env` file in the project root (gitignored) with:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...   # for SnapTrack food photo analysis
```

## Architecture

### State & persistence — local-first with Supabase cloud sync

All state flows through hooks in `hooks/`. The pattern is identical across features:

1. **`useAsyncStorage<T>(key, default)`** — generic hook that reads from AsyncStorage on mount and returns a functional-updater-compatible setter that writes through to AsyncStorage on every call.
2. **Feature stores** (`useCalorieStore`, `useWorkoutStore`, `useGalleryStore`) wrap `useAsyncStorage`, pull from Supabase on sign-in, and push to Supabase fire-and-forget after every local write. Local state always updates first; Supabase is background-only.
3. **`useLeaderboard`** — no AsyncStorage layer, reads/writes Supabase directly.

**Supabase push pattern** — query builders are `PromiseLike`, not full `Promise`. Use `.then(undefined, () => {})` to silence errors, not `.catch()`:
```ts
void supabase.from('table').upsert({...}).then(undefined, () => {});
```

**Gallery sync** additionally uses Supabase Storage (bucket `gallery`). Images are stored locally at `${FileSystem.documentDirectory}fittrack_gallery/` and mirrored at `{userId}/{imageId}.{ext}`. On sign-in, missing images are downloaded via signed URLs using `FileSystem.downloadAsync`.

### Auth flow

`context/AuthContext.tsx` wraps Supabase auth. `signUp` returns `{ error, needsConfirmation }` — when `needsConfirmation` is true the user must click an email confirmation link before a session is created. `signOut` clears all `fittrack_*` AsyncStorage keys before calling `supabase.auth.signOut()`. The root `app/_layout.tsx` contains `AuthGate` which redirects unauthenticated users to `/(auth)/login`. The `(auth)` group only contains `login.tsx` — sign-up is handled on that same screen.

### Screens

All tabs live in `app/(tabs)/`: `index`, `calories`, `workouts`, `exercises`, `gallery`, `ranking`.

`workouts.tsx` manages a 5-state internal view stack (`'level' | 'plans' | 'setup' | 'detail' | 'history'`) with its own modals rather than using router navigation.

**Non-tab stack screens** (registered in `app/_layout.tsx`):

| Screen | Route | Purpose |
|---|---|---|
| `calorie-onboarding.tsx` | `fullScreenModal` | First-run BMR/TDEE setup — collects sex, age, weight, height, activity level, goal |
| `calorie-settings.tsx` | push | Edit profile & recalculate goals; reads/writes `fittrack_user_profile` |
| `calorie-progress.tsx` | push | Progress & History — 30-day chart and editable past logs |
| `calorie-result.tsx` | modal | Meal details — shows AI-analyzed items from a food photo for review before saving |

### Calorie onboarding & nutrition calculation

`utils/nutritionCalc.ts` owns the BMR/TDEE math (Mifflin-St Jeor equation) and exports:
- `UserProfile` — the user's body stats and goal; persisted at `fittrack_user_profile` in AsyncStorage (not synced to Supabase)
- `calcPlan(profile)` — returns `CalorieGoals` (calories + protein/carbs/fat targets)
- `ACTIVITY_OPTIONS`, `GOAL_OPTIONS` — used by both onboarding and settings screens

`CalorieGoals` (in `types/calorie.types.ts`) now holds full macros: `{ calories, protein, carbs, fat }`. The `fittrack_calorie_settings` AsyncStorage key stores this shape. **Legacy format** (`{ dailyTarget }`) is normalised on read inside `useCalorieStore` — do not remove that normalisation.

### Food photo analysis

`utils/analyzeFood.ts` calls `claude-haiku-4-5-20251001` with a base64-encoded image. On web, it uses `fetch + FileReader` instead of `expo-file-system/legacy` (which throws on web). The result is an `AnalysisResult` with `items: AnalyzedItem[]`. The `calories.tsx` tab sets `pendingImage` (an exported module-level ref) before navigating to `calorie-result`, which reads it on mount.

### Workout plan system

`WorkoutState.selectedLevel` is `'beginner' | 'intermediate' | 'professional' | 'personalized'`. Personalized plans are stored in `workoutState.personalizedPlans` (an array of `WorkoutPlan`) and managed via `savePersonalizedPlan` / `deletePersonalizedPlan` in `useWorkoutStore`.

When a plan is activated, `PlanMode` is chosen: `'scheduled'` (each training day maps to a specific calendar date via `dateMap`) or `'daily'` (user marks days as done in order, no calendar constraint).

### Workout plan completion & history

When all training days are marked `finished` or `skipped`, `checkPlanCompletion()` in `workouts.tsx` builds a `CompletedPlan` record and calls `recordCompletedPlan()` from `useWorkoutStore`. This appends to `workoutState.planHistory` and clears the active plan atomically — the planHistory is persisted inside the `workout_state` Supabase row (not a separate table).

### Ranking / leaderboard

Unlocked when `workoutState.planHistory.length > 0`. Uses IPF weight classes defined in `types/ranking.types.ts`. The `leaderboard` Supabase table has a **generated column** `total = squat + bench + deadlift` — do not include `total` in upsert payloads.

### Web output mode

`app.json` sets `"output": "single"` (SPA mode). Do not change to `"static"` — Supabase's AsyncStorage crashes the SSR render with `window is not defined`.

## AsyncStorage keys

| Key | Contents |
|---|---|
| `fittrack_calorie_history` | `CalorieHistory` — all daily meal logs keyed by `YYYY-MM-DD` |
| `fittrack_calorie_settings` | `CalorieGoals` — `{ calories, protein, carbs, fat }` (legacy `{ dailyTarget }` is normalised on read) |
| `fittrack_user_profile` | `UserProfile` — body stats and goal used for BMR/TDEE; not synced to Supabase |
| `fittrack_workout_state` | `WorkoutState` — selected level, active plan ID, day status map, plan history |
| `fittrack_gallery_meta` | Gallery item metadata (URIs, dates, categories) |

## Supabase tables

| Table | Key columns | Notes |
|---|---|---|
| `calorie_history` | `user_id`, `data` (JSON blob), `updated_at` | entire history as one JSON value |
| `calorie_settings` | `user_id`, `daily_target` | syncs only the calorie target (flat column, not full `CalorieGoals`) |
| `workout_state` | `user_id`, `data` (JSON blob), `updated_at` | entire `WorkoutState` as JSON, includes `planHistory` |
| `gallery_items` | `user_id`, `id`, `name`, `date`, `category`, `storage_path` | metadata only; images in Storage bucket `gallery` |
| `leaderboard` | `user_id`, `gender`, `body_mass`, `squat`, `bench`, `deadlift`, `total` (generated), `weight_class` | one row per user, upsert on `user_id` |

All tables have RLS enabled. `calorie_history`, `workout_state`, and `gallery_items` use `onConflict: 'user_id'` upserts.

## Git workflow

Commit and push after every meaningful unit of work. Use conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`). Remote: `https://github.com/zero00cc/fittrack-ios` on branch `master`.
