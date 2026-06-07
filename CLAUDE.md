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

`context/AuthContext.tsx` wraps Supabase auth. `signUp` returns `{ error, needsConfirmation }` — when `needsConfirmation` is true the user must click an email confirmation link before a session is created. `signOut` clears all `fittrack_*` AsyncStorage keys before calling `supabase.auth.signOut()`. The root `app/_layout.tsx` contains `AuthGate` which redirects unauthenticated users to `/(auth)/login`.

### Screens

All tabs live in `app/(tabs)/`. `workouts.tsx` manages a 5-state internal view stack (`'level' | 'plans' | 'setup' | 'detail' | 'history'`) with its own modals rather than using router navigation.

### Workout plan completion & history

When all training days are marked `finished` or `skipped`, `checkPlanCompletion()` in `workouts.tsx` builds a `CompletedPlan` record and calls `recordCompletedPlan()` from `useWorkoutStore`. This appends to `workoutState.planHistory` and clears the active plan atomically — the planHistory is persisted inside the `workout_state` Supabase row (not a separate table).

### Ranking / leaderboard

Unlocked when `workoutState.planHistory.length > 0`. Uses IPF weight classes defined in `types/ranking.types.ts`. The `leaderboard` Supabase table has a **generated column** `total = squat + bench + deadlift` — do not include `total` in upsert payloads.

### Web output mode

`app.json` sets `"output": "single"` (SPA mode). Do not change to `"static"` — Supabase's AsyncStorage crashes the SSR render with `window is not defined`.

## Supabase tables

| Table | Key columns | Notes |
|---|---|---|
| `calorie_history` | `user_id`, `data` (JSON blob), `updated_at` | entire history as one JSON value |
| `calorie_settings` | `user_id`, `daily_target` | flat columns, not a JSON blob |
| `workout_state` | `user_id`, `data` (JSON blob), `updated_at` | entire `WorkoutState` as JSON, includes `planHistory` |
| `gallery_items` | `user_id`, `id`, `name`, `date`, `category`, `storage_path` | metadata only; images in Storage bucket `gallery` |
| `leaderboard` | `user_id`, `gender`, `body_mass`, `squat`, `bench`, `deadlift`, `total` (generated), `weight_class` | one row per user, upsert on `user_id` |

All tables have RLS enabled. `calorie_history`, `workout_state`, and `gallery_items` use `onConflict: 'user_id'` upserts.

## Git workflow

Commit and push after every meaningful unit of work. Use conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`). Remote: `https://github.com/zero00cc/fittrack-ios` on branch `master`.
