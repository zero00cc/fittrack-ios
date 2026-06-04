import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../../hooks/useWorkoutStore';
import { workoutPlans } from '../../data/workoutPlans';
import { ExerciseCard } from '../../components/workout/ExerciseCard';
import { TrainingLevel, WorkoutDay, DayStatus, Exercise } from '../../types/workout.types';

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

function totalSets(ex: Exercise): number {
  if (ex.setBlocks) return ex.setBlocks.reduce((s, b) => s + b.sets, 0);
  return ex.sets ?? 1;
}

function isExerciseDone(ex: Exercise, progress: Record<string, number>): boolean {
  if (ex.setBlocks) return ex.setBlocks.every((b, i) => (progress[blockKey(ex.id, i)] ?? 0) >= b.sets);
  return (progress[blockKey(ex.id, 0)] ?? 0) >= (ex.sets ?? 1);
}

export default function WorkoutsScreen() {
  const { workoutState, loaded, setLevel, activatePlan, updateDayStatus, updateSetProgress, resetPlan } = useWorkoutStore();
  const [view, setView] = useState<'level' | 'plans' | 'detail'>('level');
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);

  if (!loaded) return <View style={styles.center}><Text style={styles.loading}>Loading…</Text></View>;

  const filteredPlans = workoutState.selectedLevel
    ? workoutPlans.filter((p) => p.level === workoutState.selectedLevel)
    : [];

  const activePlan = workoutPlans.find((p) => p.id === workoutState.activePlanId) ?? null;

  const trainingDays = activePlan?.days.filter((d) => !d.isRestDay) ?? [];

  function handleSelectLevel(level: TrainingLevel) {
    setLevel(level);
    setView('plans');
  }

  function handleSelectPlan(planId: string) {
    activatePlan(planId, [1, 2, 4, 5]);
    setView('detail');
  }

  function handleReset() {
    Alert.alert('Reset Plan?', 'Your progress will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { resetPlan(); setView('plans'); } },
    ]);
  }

  function handleDayBlockUpdate(dayNumber: number, exerciseId: string, blockIndex: number, newCount: number) {
    updateSetProgress(dayNumber, blockKey(exerciseId, blockIndex), newCount);
    if (!activePlan) return;
    const day = activePlan.days.find((d) => d.dayNumber === dayNumber);
    if (!day || day.exercises.length === 0) return;
    const existingProgress = workoutState.progress?.setProgress?.[dayNumber] ?? {};
    const updated = { ...existingProgress, [blockKey(exerciseId, blockIndex)]: newCount };
    const allDone = day.exercises.every((ex) => isExerciseDone(ex, updated));
    const currentStatus: DayStatus = workoutState.progress?.dayStatus[dayNumber] ?? 'unfinished';
    if (allDone) updateDayStatus(dayNumber, 'finished');
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
      </SafeAreaView>
    );
  }

  // ── Active plan detail ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {activePlan && (
          <>
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{activePlan.name}</Text>
                <Text style={styles.planDesc} numberOfLines={2}>{activePlan.description}</Text>
              </View>
              <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Training Days</Text>
            {trainingDays.map((day) => {
              const status: DayStatus = workoutState.progress?.dayStatus[day.dayNumber] ?? 'unfinished';
              return (
                <TouchableOpacity key={day.dayNumber} style={styles.dayRow} onPress={() => setSelectedDay(day)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Text style={styles.dayExCount}>{day.exercises.length} exercises</Text>
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

      {/* Day detail modal */}
      {selectedDay && (
        <Modal visible animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedDay.label}</Text>
              <TouchableOpacity onPress={() => { updateDayStatus(selectedDay.dayNumber, 'skipped'); setSelectedDay(null); }}>
                <Text style={styles.skipBtn}>Skip</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {selectedDay.exercises.map((ex) => {
                const dayProgress = workoutState.progress?.setProgress?.[selectedDay.dayNumber] ?? {};
                const blockProgress = ex.setBlocks
                  ? ex.setBlocks.map((_, i) => dayProgress[blockKey(ex.id, i)] ?? 0)
                  : [dayProgress[blockKey(ex.id, 0)] ?? 0];
                return (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    blockProgress={blockProgress}
                    onUpdateBlock={(blockIndex, n) => handleDayBlockUpdate(selectedDay.dayNumber, ex.id, blockIndex, n)}
                  />
                );
              })}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetDayBtn}
                onPress={() => { updateDayStatus(selectedDay.dayNumber, 'unfinished'); setSelectedDay(null); }}
              >
                <Text style={styles.resetDayBtnText}>Reset Day</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
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
  resetDayBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  resetDayBtnText: { color: '#374151', fontWeight: '700', fontSize: 14 },
});
