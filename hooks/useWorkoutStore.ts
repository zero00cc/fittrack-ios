import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import { WorkoutState, TrainingLevel, DayStatus, SetBlock, Exercise } from '../types/workout.types';
import { todayYMD } from '../utils/dateUtils';

const WORKOUT_KEY = 'fittrack_workout_state';

const defaultState: WorkoutState = {
  selectedLevel: null,
  activePlanId: null,
  progress: null,
};

export function useWorkoutStore() {
  const [workoutState, setWorkoutState, loaded] = useAsyncStorage<WorkoutState>(WORKOUT_KEY, defaultState);

  const setLevel = useCallback(
    (level: TrainingLevel) =>
      setWorkoutState({ ...workoutState, selectedLevel: level, activePlanId: null, progress: null }),
    [workoutState, setWorkoutState],
  );

  const activatePlan = useCallback(
    (planId: string, weeklySchedule: number[]) =>
      setWorkoutState({
        ...workoutState,
        activePlanId: planId,
        progress: { planId, startDate: todayYMD(), dayStatus: {}, weeklySchedule },
      }),
    [workoutState, setWorkoutState],
  );

  const updateDayStatus = useCallback(
    (dayNumber: number, status: DayStatus) => {
      if (!workoutState.progress) return;
      setWorkoutState({
        ...workoutState,
        progress: {
          ...workoutState.progress,
          dayStatus: { ...workoutState.progress.dayStatus, [dayNumber]: status },
        },
      });
    },
    [workoutState, setWorkoutState],
  );

  const updateSetProgress = useCallback(
    (dayNumber: number, key: string, completedSets: number) => {
      if (!workoutState.progress) return;
      const existing = workoutState.progress.setProgress ?? {};
      const dayMap = { ...(existing[dayNumber] ?? {}) };
      dayMap[key] = completedSets;
      setWorkoutState({
        ...workoutState,
        progress: {
          ...workoutState.progress,
          setProgress: { ...existing, [dayNumber]: dayMap },
        },
      });
    },
    [workoutState, setWorkoutState],
  );

  const updateExerciseSetBlocks = useCallback(
    (dayNumber: number, exerciseId: string, blocks: SetBlock[]) => {
      if (!workoutState.progress) return;
      const existing = workoutState.progress.customSetBlocks ?? {};
      const dayMap = { ...(existing[dayNumber] ?? {}) };
      dayMap[exerciseId] = blocks;
      setWorkoutState({
        ...workoutState,
        progress: {
          ...workoutState.progress,
          customSetBlocks: { ...existing, [dayNumber]: dayMap },
        },
      });
    },
    [workoutState, setWorkoutState],
  );

  const addCustomExercise = useCallback(
    (dayNumber: number, exercise: Exercise) => {
      if (!workoutState.progress) return;
      const existing = workoutState.progress.customExercises ?? {};
      const dayList = existing[dayNumber] ?? [];
      if (dayList.some((e) => e.id === exercise.id)) return;
      setWorkoutState({
        ...workoutState,
        progress: {
          ...workoutState.progress,
          customExercises: { ...existing, [dayNumber]: [...dayList, exercise] },
        },
      });
    },
    [workoutState, setWorkoutState],
  );

  const removeCustomExercise = useCallback(
    (dayNumber: number, exerciseId: string) => {
      if (!workoutState.progress) return;
      const existing = workoutState.progress.customExercises ?? {};
      const dayList = (existing[dayNumber] ?? []).filter((e) => e.id !== exerciseId);
      setWorkoutState({
        ...workoutState,
        progress: {
          ...workoutState.progress,
          customExercises: { ...existing, [dayNumber]: dayList },
        },
      });
    },
    [workoutState, setWorkoutState],
  );

  const resetPlan = useCallback(
    () => setWorkoutState({ ...workoutState, activePlanId: null, progress: null }),
    [workoutState, setWorkoutState],
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
