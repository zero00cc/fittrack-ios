import { useCallback, useEffect, useRef } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import { WorkoutState, TrainingLevel, DayStatus, SetBlock, Exercise, PlanMode } from '../types/workout.types';
import { todayYMD } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const WORKOUT_KEY = 'fittrack_workout_state';

const defaultState: WorkoutState = {
  selectedLevel: null,
  activePlanId:  null,
  progress:      null,
};

export function useWorkoutStore() {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const [workoutState, setWorkoutState, loaded] = useAsyncStorage<WorkoutState>(WORKOUT_KEY, defaultState);

  // Guards for the reactive push effect
  const remoteFetched  = useRef(false); // true once the Supabase fetch has returned
  const skipNextPush   = useRef(false); // true when a change came from the remote load

  // ── Pull from Supabase when the user signs in ──────────────────
  useEffect(() => {
    remoteFetched.current = false; // reset on every user change
    if (!user) return;

    supabase.from('workout_state')
      .select('data')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        remoteFetched.current = true;
        if (data?.data) {
          skipNextPush.current = true;          // the next workoutState change is from us — don't echo it back
          setWorkoutState(data.data as WorkoutState);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Push to Supabase after every LOCAL change ──────────────────
  useEffect(() => {
    // Wait until AsyncStorage has loaded and the initial remote fetch is done
    if (!loaded || !remoteFetched.current) return;

    // Skip this one push (it came from the remote load above, not a user action)
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }

    const u = userRef.current;
    if (!u) return;

    supabase.from('workout_state').upsert(
      { user_id: u.id, data: workoutState, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    ).catch(() => {});
  }, [workoutState, loaded]);

  // ── Actions — all use functional updaters (stale-closure safe) ──

  const setLevel = useCallback(
    (level: TrainingLevel) =>
      setWorkoutState((prev) => ({ ...prev, selectedLevel: level, activePlanId: null, progress: null })),
    [setWorkoutState],
  );

  const activatePlan = useCallback(
    (planId: string, weeklySchedule: number[], mode: PlanMode, dateMap?: { [dateYMD: string]: number }) =>
      setWorkoutState((prev) => ({
        ...prev,
        activePlanId: planId,
        progress: { planId, startDate: todayYMD(), mode, dayStatus: {}, weeklySchedule, dateMap },
      })),
    [setWorkoutState],
  );

  const updateDayStatus = useCallback(
    (dayNumber: number, status: DayStatus, workoutDate?: string) =>
      setWorkoutState((prev) => {
        if (!prev.progress) return prev;
        const completionDates = { ...(prev.progress.completionDates ?? {}) };
        if (status === 'finished') {
          completionDates[dayNumber] = workoutDate ?? todayYMD();
        } else {
          delete completionDates[dayNumber];
        }
        return {
          ...prev,
          progress: {
            ...prev.progress,
            dayStatus: { ...prev.progress.dayStatus, [dayNumber]: status },
            completionDates,
          },
        };
      }),
    [setWorkoutState],
  );

  const updateSetProgress = useCallback(
    (dayNumber: number, key: string, completedSets: number) =>
      setWorkoutState((prev) => {
        if (!prev.progress) return prev;
        const existing = prev.progress.setProgress ?? {};
        const dayMap = { ...(existing[dayNumber] ?? {}), [key]: completedSets };
        return {
          ...prev,
          progress: { ...prev.progress, setProgress: { ...existing, [dayNumber]: dayMap } },
        };
      }),
    [setWorkoutState],
  );

  const updateExerciseSetBlocks = useCallback(
    (dayNumber: number, exerciseId: string, blocks: SetBlock[]) =>
      setWorkoutState((prev) => {
        if (!prev.progress) return prev;
        const existing = prev.progress.customSetBlocks ?? {};
        const dayMap = { ...(existing[dayNumber] ?? {}), [exerciseId]: blocks };
        return {
          ...prev,
          progress: { ...prev.progress, customSetBlocks: { ...existing, [dayNumber]: dayMap } },
        };
      }),
    [setWorkoutState],
  );

  const addCustomExercise = useCallback(
    (dayNumber: number, exercise: Exercise) =>
      setWorkoutState((prev) => {
        if (!prev.progress) return prev;
        const existing = prev.progress.customExercises ?? {};
        const dayList  = existing[dayNumber] ?? [];
        if (dayList.some((e) => e.id === exercise.id)) return prev;
        return {
          ...prev,
          progress: {
            ...prev.progress,
            customExercises: { ...existing, [dayNumber]: [...dayList, exercise] },
          },
        };
      }),
    [setWorkoutState],
  );

  const removeCustomExercise = useCallback(
    (dayNumber: number, exerciseId: string) =>
      setWorkoutState((prev) => {
        if (!prev.progress) return prev;
        const existing = prev.progress.customExercises ?? {};
        const dayList  = (existing[dayNumber] ?? []).filter((e) => e.id !== exerciseId);
        return {
          ...prev,
          progress: { ...prev.progress, customExercises: { ...existing, [dayNumber]: dayList } },
        };
      }),
    [setWorkoutState],
  );

  const resetDayProgress = useCallback(
    (dayNumber: number) =>
      setWorkoutState((prev) => {
        if (!prev.progress) return prev;
        const dayStatus       = { ...prev.progress.dayStatus };
        const completionDates = { ...(prev.progress.completionDates ?? {}) };
        const setProgress     = { ...(prev.progress.setProgress ?? {}) };
        delete dayStatus[dayNumber];
        delete completionDates[dayNumber];
        delete setProgress[dayNumber];
        return {
          ...prev,
          progress: { ...prev.progress, dayStatus, completionDates, setProgress },
        };
      }),
    [setWorkoutState],
  );

  const resetPlan = useCallback(
    () => setWorkoutState((prev) => ({ ...prev, activePlanId: null, progress: null })),
    [setWorkoutState],
  );

  return {
    workoutState,
    loaded,
    setLevel,
    activatePlan,
    updateDayStatus,
    updateSetProgress,
    updateExerciseSetBlocks,
    addCustomExercise,
    removeCustomExercise,
    resetDayProgress,
    resetPlan,
  };
}
