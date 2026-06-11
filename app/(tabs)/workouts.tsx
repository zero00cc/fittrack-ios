import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../hooks/useWorkoutStore';
import { workoutPlans } from '../../data/workoutPlans';
import { exercises as libraryExercises } from '../../data/exercises';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { ModePicker } from '../../components/workout/ModePicker';
import { WorkoutCalendar } from '../../components/workout/WorkoutCalendar';
import { ScheduleSetup } from '../../components/workout/ScheduleSetup';
import { Stopwatch } from '../../components/workout/Stopwatch';
import {
  TrainingLevel,
  WorkoutDay,
  WorkoutPlan,
  DayStatus,
  Exercise,
  SetBlock,
  PlanMode,
  CompletedPlan,
} from '../../types/workout.types';
import { isoToDisplay, todayYMD } from '../../utils/dateUtils';
import { generateId } from '../../utils/calorieUtils';

const SQUAT_C = '#ef4444';
const BENCH_C = '#3b82f6';
const DL_C    = '#a855f7';

type DailyDateConfirm =
  | { type: 'add';     dateYMD: string; nextDay: WorkoutDay }
  | { type: 'remove';  dateYMD: string; dayNumber: number; dayLabel: string }
  | { type: 'pending'; dateYMD: string; dayNumber: number; dayLabel: string; day: WorkoutDay };

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const LEVELS: Array<{ id: TrainingLevel; label: string; iconName: IoniconsName; iconColor: string; desc: string; color: string; border: string }> = [
  { id: 'beginner',     label: 'Beginner',          iconName: 'leaf',    iconColor: '#16a34a', desc: 'New to weight training. Plans focused on building a movement foundation.', color: '#f0fdf4', border: '#4ade80' },
  { id: 'intermediate', label: 'Intermediate',       iconName: 'flash',   iconColor: '#2563eb', desc: '6+ months of training. Structured progressive overload.',                  color: '#eff6ff', border: '#60a5fa' },
  { id: 'professional', label: 'Professional',       iconName: 'trophy',  iconColor: '#7c3aed', desc: 'Advanced lifter. High-intensity programs including Meta 5/3/1.',           color: '#faf5ff', border: '#c084fc' },
  { id: 'personalized', label: 'Personalized Plans', iconName: 'create',  iconColor: '#ea580c', desc: 'Build your own plan by choosing exercises from the library day by day.',   color: '#fff7ed', border: '#fb923c' },
];

const STATUS_LABELS: Record<DayStatus, string> = { finished: '✓ Done', skipped: '– Skipped', unfinished: 'Pending' };
const STATUS_COLORS: Record<DayStatus, string> = { finished: '#10b981', skipped: '#f59e0b', unfinished: '#9ca3af' };

function blockKey(exerciseId: string, blockIndex: number) {
  return `${exerciseId}-${blockIndex}`;
}

function totalBlocks(ex: Exercise): SetBlock[] {
  return ex.setBlocks ?? [{ sets: ex.sets ?? 1, reps: null, rpe: null, load: null }];
}

const LIFT_GROUPS = [
  { label: 'Squat',    test: (n: string) => /squat/i.test(n) },
  { label: 'Bench',    test: (n: string) => /bench|spoto/i.test(n) },
  { label: 'Deadlift', test: (n: string) => /deadlift/i.test(n) && !/romanian/i.test(n) },
  { label: 'Row',      test: (n: string) => /row/i.test(n) },
  { label: 'Pull',     test: (n: string) => /pull/i.test(n) },
  { label: 'Press',    test: (n: string) => /press/i.test(n) },
];

function getPlanStats(plan: WorkoutPlan): { daysPerWeek: number; lifts: string[] } {
  const daysPerWeek = plan.defaultWeeklySchedule.length;
  const week1 = plan.days.filter((d) => d.weekNumber === 1 && !d.isRestDay);
  const counts: Record<string, number> = {};
  week1.forEach((day) => {
    day.exercises.forEach((ex) => {
      for (const g of LIFT_GROUPS) {
        if (g.test(ex.name)) { counts[g.label] = (counts[g.label] ?? 0) + 1; break; }
      }
    });
  });
  const lifts = Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => `${label} ${count}×`);
  return { daysPerWeek, lifts };
}

function isExerciseDone(ex: Exercise, progress: Record<string, number>): boolean {
  return totalBlocks(ex).every((b, i) => (progress[blockKey(ex.id, i)] ?? 0) >= b.sets);
}

function libraryToExercise(lib: (typeof libraryExercises)[number]): Exercise {
  const slug = lib.name.toLowerCase().replace(/\s+/g, '+').replace(/[()]/g, '');
  return {
    id: `custom-${lib.id}`,
    name: lib.name,
    youtubeUrl: `https://www.youtube.com/results?search_query=how+to+${slug}+proper+form`,
    setBlocks: [{ sets: 3, reps: null, rpe: null, load: null }],
  };
}

export default function WorkoutsScreen() {
  const {
    workoutState,
    loaded,
    setLevel,
    activatePlan,
    assignDayDate,
    updateDayStatus,
    updateSetProgress,
    updateExerciseSetBlocks,
    addCustomExercise,
    removeCustomExercise,
    resetDayProgress,
    resetPlan,
    recordCompletedPlan,
    recordPR,
    savePersonalizedPlan,
    deletePersonalizedPlan,
  } = useWorkoutStore();

  const [view, setView] = useState<'level' | 'plans' | 'setup' | 'detail' | 'history' | 'personalized' | 'personalized-edit'>('level');
  const [completedRecord, setCompletedRecord] = useState<CompletedPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [showModePicker, setShowModePicker] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // The calendar date the user tapped in daily mode (used as the workout's completion date)
  const [selectedWorkoutDate, setSelectedWorkoutDate] = useState<string | null>(null);
  // Remembers the chosen date per day so reopening a day doesn't require re-selecting from the calendar
  const [pendingDayDates, setPendingDayDates] = useState<Record<number, string>>({});
  const [dailyDateConfirm, setDailyDateConfirm] = useState<DailyDateConfirm | null>(null);
  const [showStopwatch, setShowStopwatch] = useState(false);
  // Personalized plan state
  const [showCreatePlan,    setShowCreatePlan]    = useState(false);
  const [newPlanName,       setNewPlanName]       = useState('');
  const [newPlanDays,       setNewPlanDays]       = useState('');
  const [editingPlan,       setEditingPlan]       = useState<WorkoutPlan | null>(null);
  const [editingDayNum,     setEditingDayNum]     = useState<number | null>(null);
  const [showEditPicker,    setShowEditPicker]    = useState(false);
  const [editPickerSearch,  setEditPickerSearch]  = useState('');
  const [confirmDeleteId,   setConfirmDeleteId]   = useState<string | null>(null);
  // PR input modal (shown after mode/schedule selection, before plan activation)
  const [showPRInput,      setShowPRInput]      = useState(false);
  const [pendingMode,      setPendingMode]      = useState<PlanMode | null>(null);
  const [pendingDateMap,   setPendingDateMap]   = useState<{ [d: string]: number } | undefined>(undefined);
  const [prSquat,          setPrSquat]          = useState('');
  const [prBench,          setPrBench]          = useState('');
  const [prDeadlift,       setPrDeadlift]       = useState('');

  // These must stay above any early return to satisfy Rules of Hooks
  const dayExerciseIds = useMemo(() => {
    if (!selectedDay) return new Set<string>();
    const planIds = selectedDay.exercises.map((e) => `custom-${e.id}`);
    const customIds = (workoutState.progress?.customExercises?.[selectedDay.dayNumber] ?? []).map((e) => e.id);
    return new Set([...planIds, ...customIds]);
  }, [selectedDay, workoutState.progress?.customExercises]);

  const filteredLibrary = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    return libraryExercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroups.some((m) => m.toLowerCase().includes(q)),
    );
  }, [pickerSearch]);

  const filteredEditLibrary = useMemo(() => {
    const q = editPickerSearch.toLowerCase();
    return libraryExercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroups.some((m) => m.toLowerCase().includes(q)),
    );
  }, [editPickerSearch]);

  const editDayExerciseIds = useMemo(() => {
    if (!editingPlan || editingDayNum === null) return new Set<string>();
    const day = editingPlan.days.find((d) => d.dayNumber === editingDayNum);
    return new Set((day?.exercises ?? []).map((e) => e.id));
  }, [editingPlan, editingDayNum]);

  function addExerciseToEditDay(lib: (typeof libraryExercises)[number]) {
    if (!editingPlan || editingDayNum === null) return;
    const slug = lib.name.toLowerCase().replace(/\s+/g, '+').replace(/[()]/g, '');
    const exercise: Exercise = {
      id: lib.id,
      name: lib.name,
      youtubeUrl: `https://www.youtube.com/results?search_query=how+to+${slug}+proper+form`,
      setBlocks: [{ sets: 3, reps: null, rpe: null, load: null }],
    };
    setEditingPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.dayNumber === editingDayNum
            ? { ...d, exercises: d.exercises.some((e) => e.id === exercise.id) ? d.exercises : [...d.exercises, exercise] }
            : d,
        ),
      };
    });
  }

  function removeExerciseFromEditDay(exerciseId: string) {
    if (!editingPlan || editingDayNum === null) return;
    setEditingPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.dayNumber === editingDayNum
            ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
            : d,
        ),
      };
    });
  }

  if (!loaded) return <View style={styles.center}><Text style={styles.loading}>Loading…</Text></View>;

  const filteredPlans = workoutState.selectedLevel
    ? workoutPlans.filter((p) => p.level === workoutState.selectedLevel)
    : [];

  const activePlan = workoutPlans.find((p) => p.id === workoutState.activePlanId)
    ?? (workoutState.personalizedPlans ?? []).find((p) => p.id === workoutState.activePlanId)
    ?? null;
  const trainingDays = activePlan?.days.filter((d) => !d.isRestDay) ?? [];

  // Apply custom set blocks and append custom exercises for a given day
  function getEffectiveExercises(day: WorkoutDay): Exercise[] {
    const customBlocks = workoutState.progress?.customSetBlocks?.[day.dayNumber] ?? {};
    const plan = day.exercises.map((ex) => {
      const override = customBlocks[ex.id];
      return override ? { ...ex, setBlocks: override } : ex;
    });
    const custom = (workoutState.progress?.customExercises?.[day.dayNumber] ?? []).map((ex) => {
      const override = customBlocks[ex.id];
      return override ? { ...ex, setBlocks: override } : ex;
    });
    return [...plan, ...custom];
  }

  function totalExerciseCount(day: WorkoutDay): number {
    const custom = workoutState.progress?.customExercises?.[day.dayNumber] ?? [];
    return day.exercises.length + custom.length;
  }

  function handleSelectLevel(level: TrainingLevel) {
    setLevel(level);
    setView(level === 'personalized' ? 'personalized' : 'plans');
  }

  function handleSelectPlan(planId: string) {
    // Plan already active — go straight to detail without re-asking mode
    if (workoutState.activePlanId === planId && workoutState.progress) {
      setView('detail');
      return;
    }
    setPendingPlanId(planId);
    setShowModePicker(true);
  }

  function handleModeSelect(mode: PlanMode) {
    if (!pendingPlanId) return;
    const plan = workoutPlans.find((p) => p.id === pendingPlanId)
      ?? (workoutState.personalizedPlans ?? []).find((p) => p.id === pendingPlanId);
    if (!plan) return;

    setShowModePicker(false);

    if (mode === 'scheduled') {
      setView('setup');
      return;
    }

    // daily: show PR input before activating
    setPendingMode('daily');
    setPendingDateMap(undefined);
    setPrSquat(''); setPrBench(''); setPrDeadlift('');
    setShowPRInput(true);
    setView('detail'); // fall through to the return that renders the modal
  }

  function doActivatePlanWithPR() {
    if (!pendingPlanId || !pendingMode) return;
    const plan = workoutPlans.find((p) => p.id === pendingPlanId)
      ?? (workoutState.personalizedPlans ?? []).find((p) => p.id === pendingPlanId);
    if (!plan) return;

    const sq = parseFloat(prSquat)    || null;
    const bp = parseFloat(prBench)    || null;
    const dl = parseFloat(prDeadlift) || null;
    if (sq !== null || bp !== null || dl !== null) {
      recordPR({ id: generateId(), date: todayYMD(), squat: sq, bench: bp, deadlift: dl });
    }

    activatePlan(pendingPlanId, plan.defaultWeeklySchedule, pendingMode, pendingDateMap);
    setPendingPlanId(null);
    setPendingMode(null);
    setPendingDateMap(undefined);
    setPrSquat(''); setPrBench(''); setPrDeadlift('');
    setShowPRInput(false);
    setView('detail');
  }

  function handleReset() {
    setConfirmReset(true);
  }

  function doReset() {
    setConfirmReset(false);
    resetPlan();
    setPendingDayDates({});
    setView('level');
  }

  // Called after every status change; saves history and shows modal if plan is complete
  function checkPlanCompletion(
    updatedStatus: Record<number, DayStatus>,
    justFinishedDay?: { dayNumber: number; date?: string },
  ) {
    if (!activePlan || !workoutState.progress) return;
    const allDone = trainingDays.every((d) => {
      const s = updatedStatus[d.dayNumber];
      return s === 'finished' || s === 'skipped';
    });
    if (!allDone) return;

    const finishedDays = trainingDays.filter((d) => updatedStatus[d.dayNumber] === 'finished').length;
    const skippedDays  = trainingDays.filter((d) => updatedStatus[d.dayNumber] === 'skipped').length;
    const record: CompletedPlan = {
      id:            generateId(),
      planId:        activePlan.id,
      planName:      activePlan.name,
      level:         activePlan.level,
      startDate:     workoutState.progress.startDate,
      completedDate: todayYMD(),
      totalDays:     trainingDays.length,
      finishedDays,
      skippedDays,
      dayResults:    trainingDays.map((d) => ({
        dayNumber:      d.dayNumber,
        label:          d.label,
        status:         updatedStatus[d.dayNumber] ?? 'unfinished',
        completionDate: (justFinishedDay?.dayNumber === d.dayNumber ? justFinishedDay.date : undefined)
                        ?? workoutState.progress!.completionDates?.[d.dayNumber],
      })),
    };
    recordCompletedPlan(record); // persist to AsyncStorage + Supabase immediately
    setCompletedRecord(record);  // show celebration modal
  }

  // Tap on an unlogged date in daily mode → confirm "Add?"
  function handleDailyDateTap(dateYMD: string) {
    const nextDay = trainingDays.find(
      (d) => (workoutState.progress?.dayStatus[d.dayNumber] ?? 'unfinished') === 'unfinished',
    );
    if (nextDay) setDailyDateConfirm({ type: 'add', dateYMD, nextDay });
  }

  // Tap on a scheduled date in daily mode
  function handleLoggedDailyDateTap(dayNumber: number) {
    const status = workoutState.progress?.dayStatus[dayNumber] ?? 'unfinished';
    if (status === 'finished' || status === 'skipped') {
      // Completed day → confirm "Remove?"
      const dateYMD  = workoutState.progress?.completionDates?.[dayNumber];
      const dayLabel = activePlan?.days.find((d) => d.dayNumber === dayNumber)?.label ?? '';
      if (dateYMD) setDailyDateConfirm({ type: 'remove', dateYMD, dayNumber, dayLabel });
    } else {
      // Scheduled but not yet done → show options: start or undo
      const day = activePlan?.days.find((d) => d.dayNumber === dayNumber);
      if (day) {
        const scheduledDate =
          Object.entries(workoutState.progress?.dateMap ?? {}).find(([, dn]) => dn === dayNumber)?.[0] ?? '';
        setDailyDateConfirm({ type: 'pending', dateYMD: scheduledDate, dayNumber, dayLabel: day.label, day });
      }
    }
  }

  function handleDayBlockUpdate(dayNumber: number, exerciseId: string, blockIndex: number, newCount: number) {
    updateSetProgress(dayNumber, blockKey(exerciseId, blockIndex), newCount);
    if (!activePlan) return;
    const day = activePlan.days.find((d) => d.dayNumber === dayNumber);
    if (!day) return;
    const effectiveExercises = getEffectiveExercises(day);
    const existingProgress = workoutState.progress?.setProgress?.[dayNumber] ?? {};
    const updated = { ...existingProgress, [blockKey(exerciseId, blockIndex)]: newCount };
    const allDone = effectiveExercises.every((ex) => isExerciseDone(ex, updated));
    const currentStatus: DayStatus = workoutState.progress?.dayStatus[dayNumber] ?? 'unfinished';
    if (allDone) {
      updateDayStatus(dayNumber, 'finished', selectedWorkoutDate ?? undefined);
      const newStatus = { ...(workoutState.progress?.dayStatus ?? {}), [dayNumber]: 'finished' as DayStatus };
      checkPlanCompletion(newStatus, { dayNumber, date: selectedWorkoutDate ?? undefined });
    } else if (currentStatus === 'finished') {
      updateDayStatus(dayNumber, 'unfinished');
    }
  }


  // ── Personalized plans list ─────────────────────────────────────
  if (view === 'personalized') {
    const myPlans = workoutState.personalizedPlans ?? [];
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity onPress={() => setView('level')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>My Plans</Text>

          {myPlans.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}><Ionicons name="clipboard-outline" size={32} color="#9ca3af" /></View>
              <Text style={styles.emptyTitle}>No plans yet</Text>
              <Text style={styles.emptyDesc}>Create your first personalized workout plan below.</Text>
            </View>
          ) : (
            myPlans.map((plan) => {
              const isActive   = workoutState.activePlanId === plan.id;
              const daysSetUp  = plan.days.filter((d) => d.exercises.length > 0).length;
              return (
                <View key={plan.id} style={styles.persCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.persName}>{plan.name}</Text>
                    <Text style={styles.persInfo}>{plan.days.length} days · {daysSetUp}/{plan.days.length} configured</Text>
                    {isActive && <Text style={styles.persActiveTag}>● Active</Text>}
                  </View>
                  <View style={styles.persActions}>
                    <TouchableOpacity
                      style={styles.persEditBtn}
                      onPress={() => { setEditingPlan(plan); setView('personalized-edit'); }}
                    >
                      <Text style={styles.persEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.persActivateBtn}
                      onPress={() => {
                        if (isActive) { setView('detail'); return; }
                        activatePlan(plan.id, plan.defaultWeeklySchedule, 'daily');
                        setView('detail');
                      }}
                    >
                      <Text style={styles.persActivateText}>{isActive ? 'View' : 'Start'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.persDeleteBtn}
                      onPress={() => setConfirmDeleteId(plan.id)}
                    >
                      <Text style={styles.persDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={styles.createPlanBtn}
            onPress={() => { setNewPlanName(''); setNewPlanDays(''); setShowCreatePlan(true); }}
          >
            <Text style={styles.createPlanText}>+ Create New Plan</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Create plan modal */}
        {showCreatePlan && (
          <Modal visible transparent animationType="fade">
            <View style={styles.createOverlay}>
              <View style={styles.createCard}>
                <Text style={styles.createTitle}>New Personalized Plan</Text>
                <Text style={styles.createLabel}>Plan Name</Text>
                <TextInput
                  style={styles.createInput}
                  value={newPlanName}
                  onChangeText={setNewPlanName}
                  placeholder="e.g. My Strength Plan"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.createLabel}>Total Training Days</Text>
                <TextInput
                  style={styles.createInput}
                  value={newPlanDays}
                  onChangeText={setNewPlanDays}
                  placeholder="e.g. 12"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
                <View style={styles.createBtns}>
                  <TouchableOpacity style={styles.createCancelBtn} onPress={() => setShowCreatePlan(false)}>
                    <Text style={styles.createCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.createConfirmBtn}
                    onPress={() => {
                      const n = parseInt(newPlanDays, 10);
                      if (!newPlanName.trim() || !n || n < 1 || n > 60) return;
                      const plan: WorkoutPlan = {
                        id:                    generateId(),
                        name:                  newPlanName.trim(),
                        level:                 'personalized',
                        durationWeeks:         Math.ceil(n / 3),
                        description:           'Custom personalized plan',
                        defaultWeeklySchedule: [1, 3, 5],
                        days: Array.from({ length: n }, (_, i) => ({
                          dayNumber:  i + 1,
                          weekNumber: Math.ceil((i + 1) / 3),
                          label:      `Day ${i + 1}`,
                          isRestDay:  false,
                          exercises:  [],
                        })),
                      };
                      setShowCreatePlan(false);
                      setEditingPlan(plan);
                      setView('personalized-edit');
                    }}
                  >
                    <Text style={styles.createConfirmText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Delete confirmation modal */}
        {confirmDeleteId && (
          <Modal visible transparent animationType="fade">
            <View style={styles.createOverlay}>
              <View style={styles.createCard}>
                <Text style={styles.createTitle}>Delete Plan?</Text>
                <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                  This will permanently remove the plan and any active progress.
                </Text>
                <View style={styles.createBtns}>
                  <TouchableOpacity style={styles.createCancelBtn} onPress={() => setConfirmDeleteId(null)}>
                    <Text style={styles.createCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createConfirmBtn, { backgroundColor: '#ef4444' }]}
                    onPress={() => { deletePersonalizedPlan(confirmDeleteId); setConfirmDeleteId(null); }}
                  >
                    <Text style={styles.createConfirmText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    );
  }

  // ── Personalized plan editor ────────────────────────────────────
  if (view === 'personalized-edit' && editingPlan) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity onPress={() => { setEditingPlan(null); setView('personalized'); }} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{editingPlan.name}</Text>
          <Text style={styles.editPlanSubtitle}>Tap a day to add or remove exercises from the library.</Text>

          {editingPlan.days.map((day) => (
            <TouchableOpacity
              key={day.dayNumber}
              style={styles.editDayCard}
              onPress={() => { setEditingDayNum(day.dayNumber); setEditPickerSearch(''); setShowEditPicker(true); }}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.editDayLabel}>{day.label}</Text>
                <Text style={styles.editDayCount}>
                  {day.exercises.length > 0
                    ? day.exercises.map((e) => e.name).join(' · ')
                    : 'No exercises — tap to add'}
                </Text>
              </View>
              <Text style={styles.editDayChevron}>›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => { savePersonalizedPlan(editingPlan); setEditingPlan(null); setView('personalized'); }}
          >
            <Text style={styles.saveBtnText}>Save Plan</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Per-day exercise picker */}
        {showEditPicker && editingDayNum !== null && (
          <Modal visible animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowEditPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {editingPlan.days.find((d) => d.dayNumber === editingDayNum)?.label ?? `Day ${editingDayNum}`}
                </Text>
                <TouchableOpacity onPress={() => setShowEditPicker(false)} style={styles.pickerConfirmBtn}>
                  <Text style={styles.pickerConfirmText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={editPickerSearch}
                  onChangeText={setEditPickerSearch}
                  placeholder="Search exercises…"
                  placeholderTextColor="#9ca3af"
                  clearButtonMode="while-editing"
                  autoFocus
                />
              </View>
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {filteredEditLibrary.map((lib) => {
                  const added = editDayExerciseIds.has(lib.id);
                  return (
                    <TouchableOpacity
                      key={lib.id}
                      style={styles.pickerRow}
                      onPress={() => added ? removeExerciseFromEditDay(lib.id) : addExerciseToEditDay(lib)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerName}>{lib.name}</Text>
                        <Text style={styles.pickerMuscles}>{lib.muscleGroups.join(' · ')}</Text>
                      </View>
                      {added
                        ? <Text style={styles.pickerRemove}>✕ Remove</Text>
                        : <Text style={styles.pickerAdd}>+ Add</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        )}
      </SafeAreaView>
    );
  }

  // ── Level selector with "Today's Training" card ────────────────
  if (view === 'level') {
    const today = todayYMD();

    // Scheduled mode: check if today maps to a plan day
    const scheduledTodayNum = workoutState.progress?.mode === 'scheduled'
      ? (workoutState.progress.dateMap?.[today] ?? null)
      : null;
    const scheduledTodayDay = scheduledTodayNum
      ? activePlan?.days.find((d) => d.dayNumber === scheduledTodayNum) ?? null
      : null;

    // Next unfinished training day (daily mode or fallback)
    const nextUnfinishedDay = trainingDays.find(
      (d) => (workoutState.progress?.dayStatus[d.dayNumber] ?? 'unfinished') === 'unfinished',
    ) ?? null;

    const displayDay = scheduledTodayDay ?? nextUnfinishedDay;
    const displayStatus: DayStatus = displayDay
      ? (workoutState.progress?.dayStatus[displayDay.dayNumber] ?? 'unfinished')
      : 'unfinished';
    const isRestToday = workoutState.progress?.mode === 'scheduled' && !scheduledTodayDay && !!activePlan;

    // Plan progress
    const doneDays = trainingDays.filter(
      (d) => (workoutState.progress?.dayStatus[d.dayNumber] ?? 'unfinished') !== 'unfinished',
    ).length;
    const pct = trainingDays.length > 0 ? doneDays / trainingDays.length : 0;

    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* ── Today's Training card ─────────────────────────────── */}
          <View style={styles.todayCard}>
            <View style={styles.todayCardTop}>
              <Text style={styles.todayCardTitle}>Today's Training</Text>
              <TouchableOpacity onPress={() => router.push('/workout-history' as any)}>
                <Text style={styles.todayHistoryLink}>History →</Text>
              </TouchableOpacity>
            </View>

            {activePlan ? (
              <TouchableOpacity onPress={() => setView('detail')} activeOpacity={0.8}>
                <Text style={styles.todayPlanName}>{activePlan.name}</Text>
                <Text style={styles.todayPlanLevel}>
                  {LEVELS.find((l) => l.id === activePlan.level)?.label ?? activePlan.level}
                </Text>

                {/* Progress bar */}
                {workoutState.progress && (
                  <View style={{ marginTop: 10, gap: 4 }}>
                    <View style={styles.todayBar}>
                      <View style={[styles.todayBarFill, { width: `${Math.round(pct * 100)}%` as any }]} />
                    </View>
                    <Text style={styles.todayBarLabel}>
                      {doneDays}/{trainingDays.length} days · tap to open plan
                    </Text>
                  </View>
                )}

                {/* Today's workout */}
                <View style={styles.todayDayBox}>
                  {isRestToday ? (
                    <Text style={styles.todayRestText}>Rest day today</Text>
                  ) : displayDay ? (
                    <View style={styles.todayDayRow}>
                      <View style={[styles.todayDot, { backgroundColor: STATUS_COLORS[displayStatus] }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.todayDayName}>
                          {scheduledTodayDay ? displayDay.label : `Next: ${displayDay.label}`}
                        </Text>
                        <Text style={styles.todayDayEx}>{displayDay.exercises.length} exercises</Text>
                      </View>
                      <Text style={[styles.todayDayStatusTxt, { color: STATUS_COLORS[displayStatus] }]}>
                        {STATUS_LABELS[displayStatus]}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.todayRestText}>All training days complete 🎉</Text>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.todayEmpty}>
                <Text style={styles.todayEmptyText}>No active plan</Text>
                <Text style={styles.todayEmptySub}>Choose a training level below to get started.</Text>
              </View>
            )}
          </View>

          {/* ── Training level cards ──────────────────────────────── */}
          <Text style={styles.levelSectionTitle}>
            {activePlan ? 'Change Plan' : 'Select Training Level'}
          </Text>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={[styles.levelCard, { backgroundColor: l.color, borderColor: l.border }]}
              onPress={() => handleSelectLevel(l.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.levelIconWrap, { backgroundColor: l.iconColor + '18' }]}>
                <Ionicons name={l.iconName} size={24} color={l.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelLabel}>{l.label}</Text>
                <Text style={styles.levelDesc}>{l.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Plan list ───────────────────────────────────────────────────
  if (view === 'plans') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity onPress={() => setView('level')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{LEVELS.find((l) => l.id === workoutState.selectedLevel)?.label} Plans</Text>
          {filteredPlans.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}><Ionicons name="construct-outline" size={32} color="#9ca3af" /></View>
              <Text style={styles.emptyTitle}>Coming Soon</Text>
              <Text style={styles.emptyDesc}>Plans for this level are coming soon.</Text>
            </View>
          ) : (
            filteredPlans.map((plan) => {
              const { daysPerWeek, lifts } = getPlanStats(plan);
              return (
                <TouchableOpacity key={plan.id} style={styles.planCard} onPress={() => handleSelectPlan(plan.id)} activeOpacity={0.8}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDesc}>{plan.durationWeeks} weeks · {daysPerWeek} days/week</Text>
                    {lifts.length > 0 && (
                      <Text style={styles.planDesc}>{lifts.join(' · ')} per week</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.planWeeks}>{plan.durationWeeks}w</Text>
                    <Text style={styles.planWeeksLabel}>duration</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

        </ScrollView>

        <ModePicker
          visible={showModePicker}
          planName={workoutPlans.find((p) => p.id === pendingPlanId)?.name ?? ''}
          onSelect={handleModeSelect}
          onCancel={() => { setShowModePicker(false); setPendingPlanId(null); }}
        />
      </SafeAreaView>
    );
  }

  // ── Manual schedule setup ───────────────────────────────────────
  if (view === 'setup') {
    const plan = pendingPlanId ? workoutPlans.find((p) => p.id === pendingPlanId) : null;
    if (!plan) { setView('plans'); return null; }
    return (
      <ScheduleSetup
        plan={plan}
        onConfirm={(dateMap) => {
          setPendingMode('scheduled');
          setPendingDateMap(dateMap);
          setPrSquat(''); setPrBench(''); setPrDeadlift('');
          setShowPRInput(true);
          setView('detail'); // fall through to the return that renders the modal
        }}
        onCancel={() => {
          setPendingPlanId(null);
          setView('plans');
        }}
      />
    );
  }

  // ── Plan history — redirect to dedicated screen ────────────────
  if (view === 'history') {
    router.push('/workout-history' as any);
    setView('level');
    return null;
  }

  // ── Active plan detail ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {activePlan && (
          <>
            <TouchableOpacity
              onPress={() => setView(activePlan.level === 'personalized' ? 'personalized' : 'plans')}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{activePlan.name}</Text>
                <Text style={styles.planDesc} numberOfLines={2}>{activePlan.description}</Text>
              </View>
              {confirmReset ? (
                <View style={styles.confirmRow}>
                  <TouchableOpacity onPress={() => setConfirmReset(false)} style={styles.confirmCancelBtn}>
                    <Text style={styles.confirmCancelText}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={doReset} style={styles.confirmResetBtn}>
                    <Text style={styles.confirmResetText}>Yes, Reset</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            {workoutState.progress && (
              <WorkoutCalendar
                progress={workoutState.progress}
                trainingDayNumbers={trainingDays.map((d) => d.dayNumber)}
                onPressDay={(dayNumber) => {
                  const isDailyMode = (workoutState.progress?.mode ?? 'daily') === 'daily';
                  if (isDailyMode) {
                    handleLoggedDailyDateTap(dayNumber);
                  } else {
                    const day = activePlan?.days.find((d) => d.dayNumber === dayNumber);
                    if (day) setSelectedDay(day);
                  }
                }}
                onPressDailyDate={handleDailyDateTap}
              />
            )}

            <Text style={styles.sectionTitle}>Training Days</Text>
            <ScrollView
              style={styles.daysListScroll}
              contentContainerStyle={styles.daysListContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {trainingDays.map((day) => {
                const status: DayStatus = workoutState.progress?.dayStatus[day.dayNumber] ?? 'unfinished';
                return (
                  <TouchableOpacity key={day.dayNumber} style={styles.dayRow} onPress={() => { setSelectedDay(day); setSelectedWorkoutDate(pendingDayDates[day.dayNumber] ?? null); }} activeOpacity={0.7}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      <Text style={styles.dayExCount}>{totalExerciseCount(day)} exercises</Text>
                    </View>
                    <Text style={[styles.dayStatus, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {(workoutState.planHistory ?? []).length > 0 && (
              <TouchableOpacity style={styles.historyLink} onPress={() => router.push('/workout-history' as any)}>
                <Text style={styles.historyLinkText}>View Completed Plans & PRs ({workoutState.planHistory.length})</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        {!activePlan && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyDesc}>No plan selected.</Text>
            <TouchableOpacity onPress={() => setView('plans')} style={{ marginTop: 8 }}>
              <Text style={{ color: '#10b981', fontWeight: '600' }}>Browse Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Day detail modal ─────────────────────────────────────── */}
      {selectedDay && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setSelectedDay(null); setSelectedWorkoutDate(null); setShowStopwatch(false); }}>
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedDay.label}</Text>
              <TouchableOpacity onPress={() => {
                const dn = selectedDay.dayNumber;
                updateDayStatus(dn, 'skipped', selectedWorkoutDate ?? undefined);
                setSelectedDay(null); setSelectedWorkoutDate(null); setShowStopwatch(false);
                setPendingDayDates((prev) => { const n = { ...prev }; delete n[dn]; return n; });
                const newStatus = { ...(workoutState.progress?.dayStatus ?? {}), [dn]: 'skipped' as DayStatus };
                checkPlanCompletion(newStatus, { dayNumber: dn, date: undefined });
              }}>
                <Text style={styles.skipBtn}>Skip</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {getEffectiveExercises(selectedDay).map((ex) => {
                const isCustom = (workoutState.progress?.customExercises?.[selectedDay.dayNumber] ?? []).some((e) => e.id === ex.id);
                const dayProgress = workoutState.progress?.setProgress?.[selectedDay.dayNumber] ?? {};
                const blockProgress = totalBlocks(ex).map((_, i) => dayProgress[blockKey(ex.id, i)] ?? 0);
                return (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    blockProgress={blockProgress}
                    onUpdateBlock={(blockIndex, n) => handleDayBlockUpdate(selectedDay.dayNumber, ex.id, blockIndex, n)}
                    onEditSetBlocks={(newBlocks) => updateExerciseSetBlocks(selectedDay.dayNumber, ex.id, newBlocks)}
                    onRemove={isCustom ? () => removeCustomExercise(selectedDay.dayNumber, ex.id) : undefined}
                  />
                );
              })}

              <TouchableOpacity style={styles.addExerciseBtn} onPress={() => { setPickerSearch(''); setShowPicker(true); }}>
                <Text style={styles.addExerciseBtnText}>+ Add Exercise from Library</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => {
                  const dn = selectedDay.dayNumber;
                  updateDayStatus(dn, 'finished', selectedWorkoutDate ?? undefined);
                  setSelectedDay(null); setSelectedWorkoutDate(null); setShowStopwatch(false);
                  setPendingDayDates((prev) => { const n = { ...prev }; delete n[dn]; return n; });
                  const newStatus = { ...(workoutState.progress?.dayStatus ?? {}), [dn]: 'finished' as DayStatus };
                  checkPlanCompletion(newStatus, { dayNumber: dn, date: selectedWorkoutDate ?? undefined });
                }}
              >
                <Text style={styles.completeBtnText}>✓ Mark as Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resetDayBtn}
                onPress={() => { const dn = selectedDay.dayNumber; updateDayStatus(dn, 'unfinished'); setSelectedDay(null); setSelectedWorkoutDate(null); setPendingDayDates((prev) => { const n = { ...prev }; delete n[dn]; return n; }); }}
              >
                <Text style={styles.resetDayBtnText}>Reset Day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopwatchBtn}
                onPress={() => setShowStopwatch(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="timer-outline" size={18} color="#16a34a" />
                  <Text style={styles.stopwatchBtnText}>Stopwatch</Text>
                </View>
              </TouchableOpacity>
            </View>
            {/* Stopwatch overlay — floats above the day detail content */}
            {showStopwatch && (
              <View style={styles.stopwatchOverlay}>
                <Stopwatch onClose={() => setShowStopwatch(false)} />
              </View>
            )}
            {/* Exercise picker overlay — inside this modal to avoid iOS nested-modal bug */}
            {showPicker && (
              <View style={styles.pickerOverlay}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text style={styles.modalCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Exercise Library</Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.pickerConfirmBtn}>
                    <Text style={styles.pickerConfirmText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    value={pickerSearch}
                    onChangeText={setPickerSearch}
                    placeholder="Search by name or muscle group…"
                    placeholderTextColor="#9ca3af"
                    clearButtonMode="while-editing"
                  />
                </View>
                <ScrollView contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
                  {filteredLibrary.map((lib) => {
                    const alreadyAdded = dayExerciseIds.has(`custom-${lib.id}`);
                    return (
                      <TouchableOpacity
                        key={lib.id}
                        style={styles.pickerRow}
                        onPress={() => {
                          if (alreadyAdded) {
                            removeCustomExercise(selectedDay.dayNumber, `custom-${lib.id}`);
                          } else {
                            addCustomExercise(selectedDay.dayNumber, libraryToExercise(lib));
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pickerName}>{lib.name}</Text>
                          <Text style={styles.pickerMuscles}>{lib.muscleGroups.join(' · ')}</Text>
                        </View>
                        {alreadyAdded ? (
                          <Text style={styles.pickerRemove}>✕ Remove</Text>
                        ) : (
                          <Text style={styles.pickerAdd}>+ Add</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {filteredLibrary.length === 0 && (
                    <Text style={styles.pickerEmpty}>No exercises match "{pickerSearch}"</Text>
                  )}
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      )}

      {/* ── Daily date confirm modal ─────────────────────────────── */}
      {/* ── PR input modal (shown before activating a plan) ─────── */}
      {showPRInput && (
        <Modal visible transparent animationType="slide">
          <View style={styles.prOverlay}>
            <View style={styles.prCard}>
              <Text style={styles.prTitle}>Log Your Current PRs</Text>
              <Text style={styles.prSubtitle}>
                Record your 1-rep max before starting. All fields are optional.
              </Text>

              {([
                { label: 'Squat',       color: SQUAT_C, val: prSquat,    set: setPrSquat    },
                { label: 'Bench Press', color: BENCH_C, val: prBench,    set: setPrBench    },
                { label: 'Deadlift',    color: DL_C,    val: prDeadlift, set: setPrDeadlift },
              ] as const).map(({ label, color, val, set }) => (
                <View key={label} style={styles.prField}>
                  <View style={[styles.prFieldBar, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prFieldLabel}>{label}</Text>
                    <View style={styles.prInputRow}>
                      <TextInput
                        style={styles.prInput}
                        value={val}
                        onChangeText={set as (v: string) => void}
                        keyboardType="decimal-pad"
                        placeholder="—"
                        placeholderTextColor="#9ca3af"
                        selectTextOnFocus
                      />
                      <Text style={styles.prUnit}>kg</Text>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.prStartBtn} onPress={doActivatePlanWithPR}>
                <Text style={styles.prStartText}>Save & Start Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.prSkipBtn}
                onPress={() => { setPrSquat(''); setPrBench(''); setPrDeadlift(''); doActivatePlanWithPR(); }}
              >
                <Text style={styles.prSkipText}>Skip — start without logging</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Plan complete celebration modal ──────────────────────── */}
      {completedRecord && (
        <Modal visible transparent animationType="fade">
          <View style={styles.celebrationOverlay}>
            <View style={styles.celebrationCard}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
              <Text style={styles.celebrationTitle}>Plan Complete!</Text>
              <Text style={styles.celebrationPlan}>{completedRecord.planName}</Text>
              <View style={styles.celebrationStats}>
                <View style={styles.celebrationStat}>
                  <Text style={styles.celebrationStatNum}>{completedRecord.finishedDays}</Text>
                  <Text style={styles.celebrationStatLabel}>Done</Text>
                </View>
                <View style={styles.celebrationStat}>
                  <Text style={[styles.celebrationStatNum, { color: '#f59e0b' }]}>{completedRecord.skippedDays}</Text>
                  <Text style={styles.celebrationStatLabel}>Skipped</Text>
                </View>
                <View style={styles.celebrationStat}>
                  <Text style={styles.celebrationStatNum}>{completedRecord.totalDays}</Text>
                  <Text style={styles.celebrationStatLabel}>Total</Text>
                </View>
              </View>
              <Text style={styles.celebrationSaved}>Saved to your history ✓</Text>
              <TouchableOpacity
                style={styles.celebrationBtn}
                onPress={() => {
                  setCompletedRecord(null);
                  setView('level');
                }}
              >
                <Text style={styles.celebrationBtnText}>Start a New Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.celebrationSecondary}
                onPress={() => {
                  setCompletedRecord(null);
                  setView('history');
                }}
              >
                <Text style={styles.celebrationSecondaryText}>View History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.celebrationHome}
                onPress={() => {
                  setCompletedRecord(null);
                  router.push('/(tabs)');
                }}
              >
                <Text style={styles.celebrationHomeText}>Return to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {dailyDateConfirm && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.confirmOverlay}
            activeOpacity={1}
            onPress={() => setDailyDateConfirm(null)}
          >
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>
                {dailyDateConfirm.type === 'add'     ? 'Add to Calendar?' :
                 dailyDateConfirm.type === 'pending' ? dailyDateConfirm.dayLabel :
                                                       'Remove from Calendar?'}
              </Text>
              <Text style={styles.confirmDate}>{isoToDisplay(dailyDateConfirm.dateYMD)}</Text>

              {dailyDateConfirm.type === 'add' ? (
                <Text style={styles.confirmBody}>
                  Schedules{' '}
                  <Text style={styles.confirmBold}>{dailyDateConfirm.nextDay.label}</Text>
                </Text>
              ) : dailyDateConfirm.type === 'pending' ? (
                <Text style={styles.confirmBody}>Scheduled — not yet started</Text>
              ) : (
                <Text style={styles.confirmBody}>
                  Clears all progress for{'\n'}
                  <Text style={styles.confirmBold}>{dailyDateConfirm.dayLabel}</Text>
                </Text>
              )}

              {dailyDateConfirm.type === 'pending' ? (
                <View style={styles.confirmBtnsCol}>
                  <TouchableOpacity
                    onPress={() => {
                      const { dateYMD, dayNumber, day } = dailyDateConfirm;
                      setDailyDateConfirm(null);
                      setPendingDayDates((prev) => dateYMD ? { ...prev, [dayNumber]: dateYMD } : prev);
                      setSelectedWorkoutDate(dateYMD || null);
                      setSelectedDay(day);
                    }}
                    style={styles.confirmAddBtn}
                  >
                    <Text style={styles.confirmAddText}>Start Workout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      resetDayProgress(dailyDateConfirm.dayNumber);
                      setDailyDateConfirm(null);
                    }}
                    style={styles.confirmRemoveBtn}
                  >
                    <Text style={styles.confirmRemoveText}>Remove from Calendar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDailyDateConfirm(null)}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.confirmBtns}>
                  <TouchableOpacity
                    onPress={() => setDailyDateConfirm(null)}
                    style={styles.confirmCancelBtn}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  {dailyDateConfirm.type === 'add' ? (
                    <TouchableOpacity
                      onPress={() => {
                        const { dateYMD, nextDay } = dailyDateConfirm;
                        setDailyDateConfirm(null);
                        setPendingDayDates((prev) => ({ ...prev, [nextDay.dayNumber]: dateYMD }));
                        assignDayDate(nextDay.dayNumber, dateYMD);
                      }}
                      style={[styles.confirmAddBtn, { flex: 1 }]}
                    >
                      <Text style={styles.confirmAddText}>Add Day</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        resetDayProgress(dailyDateConfirm.dayNumber);
                        setDailyDateConfirm(null);
                      }}
                      style={[styles.confirmRemoveBtn, { flex: 1 }]}
                    >
                      <Text style={styles.confirmRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#9ca3af', fontSize: 15 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  backBtn: { marginBottom: 4 },
  backBtnText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  // Today's Training card
  todayCard:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  todayCardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  todayCardTitle:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  todayHistoryLink:  { fontSize: 13, fontWeight: '700', color: '#6366f1' },
  todayPlanName:     { fontSize: 16, fontWeight: '800', color: '#111827' },
  todayPlanLevel:    { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  todayBar:          { height: 5, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  todayBarFill:      { height: 5, backgroundColor: '#10b981', borderRadius: 3 },
  todayBarLabel:     { fontSize: 11, color: '#9ca3af' },
  todayDayBox:       { marginTop: 12, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12 },
  todayDayRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayDot:          { width: 8, height: 8, borderRadius: 4 },
  todayDayName:      { fontSize: 13, fontWeight: '700', color: '#111827' },
  todayDayEx:        { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  todayDayStatusTxt: { fontSize: 12, fontWeight: '700' },
  todayRestText:     { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 4 },
  todayEmpty:        { alignItems: 'center', paddingVertical: 20 },
  todayEmptyText:    { fontSize: 14, fontWeight: '700', color: '#374151' },
  todayEmptySub:     { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'center', lineHeight: 18 },
  levelSectionTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  levelCard: { borderRadius: 16, borderWidth: 2, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  levelIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  levelLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  levelDesc: { fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 17 },
  planCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  planHeader: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  planName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  planDesc: { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  planWeeks: { fontSize: 22, fontWeight: '800', color: '#111827' },
  planWeeksLabel: { fontSize: 11, color: '#9ca3af' },
  resetBtn: { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  resetBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  confirmRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  confirmCancelBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  confirmCancelText: { color: '#6b7280', fontSize: 12, fontWeight: '600', textAlign: 'center', paddingVertical: 4 },
  confirmResetBtn: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  confirmResetText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Daily date confirm modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 8 },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' },
  confirmDate: { fontSize: 14, fontWeight: '600', color: '#6366f1', textAlign: 'center' },
  confirmBody: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },
  confirmBold: { fontWeight: '700', color: '#111827' },
  confirmBtns:    { flexDirection: 'row', gap: 10, marginTop: 6 },
  confirmBtnsCol: { flexDirection: 'column', gap: 8, marginTop: 6 },
  confirmAddBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmAddText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  confirmRemoveBtn: { backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmRemoveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  daysListScroll:   { maxHeight: 300 },
  daysListContent:  { gap: 8, paddingBottom: 2 },
  dayRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  dayExCount: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  dayStatus: { fontSize: 12, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e5e7eb' },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptyDesc: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalCancel: { color: '#6b7280', fontSize: 15, minWidth: 50 },
  modalTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center', marginHorizontal: 8 },
  skipBtn: { color: '#f59e0b', fontSize: 15, fontWeight: '700', minWidth: 50, textAlign: 'right' },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  completeBtn: { backgroundColor: '#10b981', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resetDayBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  resetDayBtnText: { color: '#374151', fontWeight: '700', fontSize: 14 },
  stopwatchBtn: { marginTop: 8, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' },
  stopwatchBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
  stopwatchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 10 },
  addExerciseBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4ade80',
    borderStyle: 'dashed',
  },
  addExerciseBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '700' },
  // Picker
  searchRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  pickerMuscles: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  pickerConfirmBtn: { backgroundColor: '#10b981', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, minWidth: 50, alignItems: 'center' },
  pickerConfirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  pickerAdd: { color: '#10b981', fontSize: 13, fontWeight: '700', paddingLeft: 12 },
  pickerRemove: { color: '#ef4444', fontSize: 13, fontWeight: '700', paddingLeft: 12 },
  pickerEmpty: { textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 32 },
  // History link button (detail view)
  historyLink: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  historyLinkText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
  // History box (plans view)
  historyBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, gap: 2 },
  historyBoxTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  historyBoxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  historyBoxPlanName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  historyBoxDates: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  historyBoxBadge: { alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  historyBoxBadgeText: { fontSize: 15, fontWeight: '800', color: '#10b981' },
  historyBoxBadgeLabel: { fontSize: 9, color: '#6b7280' },
  // History view
  historyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  historyCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  historyPlanName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  historyDates: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  historyBadge: { alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  historyBadgeText: { fontSize: 18, fontWeight: '800', color: '#10b981' },
  historyBadgeLabel: { fontSize: 10, color: '#6b7280' },
  historyDayList: { gap: 6 },
  historyDayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDayStatus: { fontSize: 11, fontWeight: '700', width: 60 },
  historyDayLabel: { flex: 1, fontSize: 12, color: '#374151' },
  historyDayDate: { fontSize: 11, color: '#9ca3af' },
  // Celebration modal
  celebrationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  celebrationCard: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', gap: 8 },
  celebrationEmoji: { fontSize: 56 },
  celebrationTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  celebrationPlan: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  celebrationStats: { flexDirection: 'row', gap: 24, marginVertical: 8 },
  celebrationStat: { alignItems: 'center' },
  celebrationStatNum: { fontSize: 28, fontWeight: '800', color: '#10b981' },
  celebrationStatLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  celebrationSaved: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  celebrationBtn: { width: '100%', backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  celebrationBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  celebrationSecondary: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  celebrationSecondaryText: { color: '#6366f1', fontWeight: '600', fontSize: 14 },
  celebrationHome: { width: '100%', paddingVertical: 10, alignItems: 'center' },
  celebrationHomeText: { color: '#9ca3af', fontWeight: '500', fontSize: 13 },
  // Personalized plans list
  persCard:        { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  persName:        { fontSize: 14, fontWeight: '700', color: '#111827' },
  persInfo:        { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  persActiveTag:   { fontSize: 11, color: '#10b981', fontWeight: '700', marginTop: 3 },
  persActions:     { flexDirection: 'row', gap: 6 },
  persEditBtn:     { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  persEditText:    { color: '#374151', fontSize: 12, fontWeight: '600' },
  persActivateBtn: { backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  persActivateText:{ color: '#10b981', fontSize: 12, fontWeight: '700' },
  persDeleteBtn:   { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  persDeleteText:  { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  createPlanBtn:   { marginTop: 4, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fb923c', borderStyle: 'dashed' },
  createPlanText:  { color: '#ea580c', fontSize: 14, fontWeight: '700' },
  // Create plan modal
  createOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  createCard:      { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 6 },
  createTitle:     { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  createLabel:     { fontSize: 12, fontWeight: '600', color: '#6b7280', marginTop: 6 },
  createInput:     { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', marginTop: 4 },
  createBtns:      { flexDirection: 'row', gap: 10, marginTop: 14 },
  createCancelBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  createCancelText:{ color: '#6b7280', fontSize: 14, fontWeight: '600' },
  createConfirmBtn:{ flex: 1, backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  createConfirmText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  // PR input modal
  prOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  prCard:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, paddingBottom: 36 },
  prTitle:      { fontSize: 19, fontWeight: '800', color: '#111827', textAlign: 'center' },
  prSubtitle:   { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 18, marginTop: -4 },
  prField:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  prFieldBar:   { width: 4, height: 40, borderRadius: 2 },
  prFieldLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  prInputRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  prInput:      { fontSize: 24, fontWeight: '800', color: '#111827', width: 90 },
  prUnit:       { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  prStartBtn:   { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  prStartText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  prSkipBtn:    { paddingVertical: 10, alignItems: 'center' },
  prSkipText:   { color: '#9ca3af', fontSize: 13 },
  // Plan editor
  editPlanSubtitle:{ fontSize: 13, color: '#6b7280', marginBottom: 4 },
  editDayCard:     { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  editDayLabel:    { fontSize: 13, fontWeight: '700', color: '#111827' },
  editDayCount:    { fontSize: 11, color: '#9ca3af', marginTop: 3, flexShrink: 1 },
  editDayChevron:  { fontSize: 20, color: '#d1d5db', marginLeft: 8 },
  saveBtn:         { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
