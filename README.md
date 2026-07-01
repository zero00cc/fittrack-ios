# FitTrack iOS

A React Native + Expo fitness tracking app for logging calories, following powerlifting programs, browsing exercise guidance, and competing on a global leaderboard.

## Demo

<video src="assets/demo.mp4" width="390" controls autoplay loop muted></video>

## Features

- **Calorie Tracker** — Log daily meals, set macro targets (calories/protein/carbs/fat), view a 30-day history chart, and analyze food photos with AI (via Supabase Edge Functions + Claude)
- **Workout Plans** — Beginner / Intermediate / Professional powerlifting programs (Meta 5/3/1, GZCLP, and more), with per-set tracking, RPE guidance, and intensity-based load calculation from your personal records
- **Exercise Library** — Step-by-step instructions, coaching tips, and YouTube demos for every exercise
- **Global Ranking** — Submit your Squat / Bench / Deadlift totals and rank against other users by IPF weight class
- **Workout History** — Completed plan log, activity calendar, and personal record (PR) tracker for the Big 3
- **AI Reports** — Weekly and monthly fitness summaries generated from your calorie and weight history

## Tech Stack

- React Native 0.86 + Expo SDK 57 (expo-router, file-based navigation)
- TypeScript
- Supabase — auth, cloud sync (calorie history, workout state, weight log), Storage (gallery images), and Edge Functions (Anthropic API proxy)
- AsyncStorage — local-first persistence; Supabase is synced in the background
- Hermes JavaScript engine

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env` in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The Anthropic API key lives as a Supabase Edge Function secret (`ANTHROPIC_KEY`) — it never reaches the client.

### 3. Deploy Edge Functions

```bash
supabase functions deploy analyze-food --no-verify-jwt
supabase functions deploy generate-report --no-verify-jwt
supabase secrets set ANTHROPIC_KEY=sk-ant-...
```

### 4. Run the app

```bash
npx expo start --ios     # iOS simulator
npx expo start           # Expo Go on device (scan QR)
```

## Project Structure

```
fittrack-ios/
├── app/
│   ├── (tabs)/           # Main tab screens (home, calories, workouts, exercises, ranking)
│   ├── (auth)/           # Login / sign-up
│   ├── calorie-*.tsx     # Calorie onboarding, settings, progress, result screens
│   ├── workout-history.tsx
│   └── resources.tsx
├── context/
│   └── AuthContext.tsx   # Supabase auth wrapper
├── hooks/
│   ├── useAsyncStorage.ts
│   ├── useCalorieStore.ts
│   ├── useWorkoutStore.ts
│   ├── useGalleryStore.ts
│   └── useLeaderboard.ts
├── data/
│   ├── workoutPlans.ts   # All built-in workout programs
│   └── exercises.ts      # Exercise library
├── supabase/
│   ├── functions/        # Edge Functions (analyze-food, generate-report)
│   └── migrations.sql
├── utils/
│   ├── nutritionCalc.ts  # BMR/TDEE (Mifflin-St Jeor)
│   ├── analyzeFood.ts    # Food photo → AI analysis
│   └── generateReport.ts # AI fitness report
└── constants/
    └── theme.ts          # Design tokens (amber palette)
```
