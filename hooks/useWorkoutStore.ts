import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import { WorkoutState, TrainingLevel, DayStatus, SetBlock, Exercise, PlanMode } from '../types/workout.types';
import { todayYMD } from '../utils/dateUtils';

const WORKOUT_KEY = 'fittrack_workout_state';

const defaultState: WorkoutState = {
  selectedLevel: null,
  activePlanId: null,
  progress: null,
};

export function useWorkoutStore() {
  const [workoutState, setWorkoutState, loaded] = useAsyncStorage<WorkoutState>(WORKOUT_KEY, defaultState);

  // All actions use the functional-updater form of setWorkoutState so they
  // always operate on the latest state, never a stale closure snapshot.

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
    (dayNumber: number, status: DayStatus) =>
      setWorkoutState((prev) => {
        if (!prev.progress) return prev;
        const completionDates = { ...(prev.progress.completionDates ?? {}) };
        if (status === 'finished') {
          completionDates[dayNumber] = todayYMD();
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
        const dayList = existing[dayNumber] ?? [];
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
        const dayList = (existing[dayNumber] ?? []).filter((e) => e.id !== exerciseId);
        return {
          ...prev,
          progress: {
            ...prev.progress,
            customExercises: { ...existing, [dayNumber]: dayList },
          },
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
    resetPlan,
  };
}
