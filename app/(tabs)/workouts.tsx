import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  DayStatus,
  Exercise,
  SetBlock,
  PlanMode,
} from '../../types/workout.types';
import { isoToDisplay } from '../../utils/dateUtils';

type DailyDateConfirm =
  | { type: 'add';    dateYMD: string; nextDay: WorkoutDay }
  | { type: 'remove'; dateYMD: string; dayNumber: number; dayLabel: string };

const LEVELS: Array<{ id: TrainingLevel; label: string; icon: string; desc: string; color: string; border: string }> = [
  { id: 'beginner', label: 'Beginner', icon: '🌱', desc: 'New to weight training. Plans focused on building a movement foundation.', color: '#f0fdf4', border: '#4ade80' },
  { id: 'intermediate', label: 'Intermediate', icon: '⚡', desc: '6+ months of training. Structured progressive overload.', color: '#eff6ff', border: '#60a5fa' },
  { id: 'professional', label: 'Professional', icon: '🏆', desc: 'Advanced lifter. High-intensity programs including Meta 5/3/1.', color: '#faf5ff', border: '#c084fc' },
];

const STATUS_LABELS: Record<DayStatus, string> = { finished: '✓ Done', skipped: '– Skipped', unfinished: 'Pending' };
const STATUS_COLORS: Record<DayStatus, string> = { finished: '#10b981', skipped: '#f59e0b', unfinished: '#9ca3af' };

function blockKey(exerciseId: string, blockIndex: number) {
  return `${exerciseId}-${blockIndex}`;
}

function totalBlocks(ex: Exercise): SetBlock[] {
  return ex.setBlocks ?? [{ sets: ex.sets ?? 1, reps: null, rpe: null, load: null }];
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
    updateDayStatus,
    updateSetProgress,
    updateExerciseSetBlocks,
    addCustomExercise,
    removeCustomExercise,
    resetDayProgress,
    resetPlan,
  } = useWorkoutStore();

  const [view, setView] = useState<'level' | 'plans' | 'setup' | 'detail'>('level');
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [showModePicker, setShowModePicker] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // The calendar date the user tapped in daily mode (used as the workout's completion date)
  const [selectedWorkoutDate, setSelectedWorkoutDate] = useState<string | null>(null);
  const [dailyDateConfirm, setDailyDateConfirm] = useState<DailyDateConfirm | null>(null);
  const [showStopwatch, setShowStopwatch] = useState(false);

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

  if (!loaded) return <View style={styles.center}><Text style={styles.loading}>Loading…</Text></View>;

  const filteredPlans = workoutState.selectedLevel
    ? workoutPlans.filter((p) => p.level === workoutState.selectedLevel)
    : [];

  const activePlan = workoutPlans.find((p) => p.id === workoutState.activePlanId) ?? null;
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
    setView('plans');
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
    const plan = workoutPlans.find((p) => p.id === pendingPlanId);
    if (!plan) return;

    setShowModePicker(false);

    if (mode === 'scheduled') {
      // Go to the manual scheduling screen (pendingPlanId stays set)
      setView('setup');
      return;
    }

    // daily: activate immediately with no pre-assigned dates
    activatePlan(pendingPlanId, plan.defaultWeeklySchedule, 'daily', undefined);
    setPendingPlanId(null);
    setView('detail');
  }

  function handleReset() {
    setConfirmReset(true);
  }

  function doReset() {
    setConfirmReset(false);
    resetPlan();
    setView('level');
  }

  // Tap on an unlogged date in daily mode → confirm "Add?"
  function handleDailyDateTap(dateYMD: string) {
    const nextDay = trainingDays.find(
      (d) => (workoutState.progress?.dayStatus[d.dayNumber] ?? 'unfinished') === 'unfinished',
    );
    if (nextDay) setDailyDateConfirm({ type: 'add', dateYMD, nextDay });
  }

  // Tap on a logged date in daily mode → confirm "Remove?"
  function handleLoggedDailyDateTap(dayNumber: number) {
    const dateYMD  = workoutState.progress?.completionDates?.[dayNumber];
    const dayLabel = activePlan?.days.find((d) => d.dayNumber === dayNumber)?.label ?? '';
    if (dateYMD) setDailyDateConfirm({ type: 'remove', dateYMD, dayNumber, dayLabel });
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
    if (allDone) updateDayStatus(dayNumber, 'finished', selectedWorkoutDate ?? undefined);
    else if (currentStatus === 'finished') updateDayStatus(dayNumber, 'unfinished');
  }


  // ── Level selector ──────────────────────────────────────────────
  if (view === 'level') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.pageTitle}>Select Training Level</Text>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={[styles.levelCard, { backgroundColor: l.color, borderColor: l.border }]}
              onPress={() => handleSelectLevel(l.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.levelIcon}>{l.icon}</Text>
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
              <Text style={styles.emptyIcon}>🚧</Text>
              <Text style={styles.emptyTitle}>Coming Soon</Text>
              <Text style={styles.emptyDesc}>Plans for this level are coming soon.</Text>
            </View>
          ) : (
            filteredPlans.map((plan) => (
              <TouchableOpacity key={plan.id} style={styles.planCard} onPress={() => handleSelectPlan(plan.id)} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDesc} numberOfLines={3}>{plan.description}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.planWeeks}>{plan.durationWeeks}w</Text>
                  <Text style={styles.planWeeksLabel}>duration</Text>
                </View>
              </TouchableOpacity>
            ))
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
          activatePlan(pendingPlanId!, plan.defaultWeeklySchedule, 'scheduled', dateMap);
          setPendingPlanId(null);
          setView('detail');
        }}
        onCancel={() => {
          setPendingPlanId(null);
          setView('plans');
        }}
      />
    );
  }

  // ── Active plan detail ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {activePlan && (
          <>
            <TouchableOpacity onPress={() => setView('plans')} style={styles.backBtn}>
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
            {trainingDays.map((day) => {
              const status: DayStatus = workoutState.progress?.dayStatus[day.dayNumber] ?? 'unfinished';
              return (
                <TouchableOpacity key={day.dayNumber} style={styles.dayRow} onPress={() => setSelectedDay(day)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Text style={styles.dayExCount}>{totalExerciseCount(day)} exercises</Text>
                  </View>
                  <Text style={[styles.dayStatus, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text>
                </TouchableOpacity>
              );
            })}
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
                updateDayStatus(selectedDay.dayNumber, 'skipped', selectedWorkoutDate ?? undefined);
                setSelectedDay(null);
                setSelectedWorkoutDate(null);
                setShowStopwatch(false);
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
                  updateDayStatus(selectedDay.dayNumber, 'finished', selectedWorkoutDate ?? undefined);
                  setSelectedDay(null);
                  setSelectedWorkoutDate(null);
                  setShowStopwatch(false);
                }}
              >
                <Text style={styles.completeBtnText}>✓ Mark as Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resetDayBtn}
                onPress={() => { updateDayStatus(selectedDay.dayNumber, 'unfinished'); setSelectedDay(null); setSelectedWorkoutDate(null); }}
              >
                <Text style={styles.resetDayBtnText}>Reset Day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopwatchBtn}
                onPress={() => setShowStopwatch(true)}
              >
                <Text style={styles.stopwatchBtnText}>⏱ Stopwatch</Text>
              </TouchableOpacity>
            </View>
            {/* Stopwatch overlay — floats above the day detail content */}
            {showStopwatch && (
              <View style={styles.stopwatchOverlay}>
                <Stopwatch onClose={() => setShowStopwatch(false)} />
              </View>
            )}
          </SafeAreaView>
        </Modal>
      )}

      {/* ── Exercise picker modal ────────────────────────────────── */}
      {showPicker && selectedDay && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
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
                autoFocus
              />
            </View>

            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {filteredLibrary.map((lib) => {
                const alreadyAdded = dayExerciseIds.has(`custom-${lib.id}`);
                return (
                  <TouchableOpacity
                    key={lib.id}
                    style={styles.pickerRow}
                    onPress={() => {
                      if (!selectedDay) return;
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
          </SafeAreaView>
        </Modal>
      )}

      {/* ── Daily date confirm modal ─────────────────────────────── */}
      {dailyDateConfirm && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.confirmOverlay}
            activeOpacity={1}
            onPress={() => setDailyDateConfirm(null)}
          >
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>
                {dailyDateConfirm.type === 'add' ? 'Add to Calendar?' : 'Remove from Calendar?'}
              </Text>
              <Text style={styles.confirmDate}>{isoToDisplay(dailyDateConfirm.dateYMD)}</Text>

              {dailyDateConfirm.type === 'add' ? (
                <Text style={styles.confirmBody}>
                  Opens{' '}
                  <Text style={styles.confirmBold}>{dailyDateConfirm.nextDay.label}</Text>
                </Text>
              ) : (
                <Text style={styles.confirmBody}>
                  Clears all progress for{'\n'}
                  <Text style={styles.confirmBold}>{dailyDateConfirm.dayLabel}</Text>
                </Text>
              )}

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
                      setSelectedWorkoutDate(dateYMD);
                      setSelectedDay(nextDay);
                    }}
                    style={styles.confirmAddBtn}
                  >
                    <Text style={styles.confirmAddText}>Add Day</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      resetDayProgress(dailyDateConfirm.dayNumber);
                      setDailyDateConfirm(null);
                    }}
                    style={styles.confirmRemoveBtn}
                  >
                    <Text style={styles.confirmRemoveText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  levelCard: { borderRadius: 16, borderWidth: 2, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  levelIcon: { fontSize: 32 },
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
  confirmCancelText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  confirmResetBtn: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  confirmResetText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Daily date confirm modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  confirmCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 8 },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' },
  confirmDate: { fontSize: 14, fontWeight: '600', color: '#6366f1', textAlign: 'center' },
  confirmBody: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 },
  confirmBold: { fontWeight: '700', color: '#111827' },
  confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  confirmAddBtn: { flex: 1, backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmAddText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  confirmRemoveBtn: { flex: 1, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmRemoveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  dayRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  dayExCount: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  dayStatus: { fontSize: 12, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e5e7eb' },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
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
});
