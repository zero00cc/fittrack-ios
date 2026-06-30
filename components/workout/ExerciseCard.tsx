import { useState } from 'react';
import { Alert, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Exercise, SetBlock } from '../../types/workout.types';

interface LatestPR {
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
}

interface Props {
  exercise: Exercise;
  blockProgress: number[];
  onUpdateBlock: (blockIndex: number, newCount: number) => void;
  onEditSetBlocks?: (newBlocks: SetBlock[]) => void;
  onRemove?: () => void;
  latestPR?: LatestPR | null;
}

// ── Number stepper ────────────────────────────────────────────────
interface StepperProps {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min: number;
  max: number;
  nullable: boolean;
  decimals?: number;
}

function Stepper({ value, onChange, step, min, max, nullable, decimals = 0 }: StepperProps) {
  function decrement() {
    if (value === null) return;
    const next = parseFloat((value - step).toFixed(decimals + 1));
    if (next < min) {
      if (nullable) onChange(null);
    } else {
      onChange(next);
    }
  }

  function increment() {
    if (value === null) { onChange(min); return; }
    const next = parseFloat((value + step).toFixed(decimals + 1));
    onChange(Math.min(max, next));
  }

  const canDec = value !== null && (nullable || value > min);
  const canInc = value === null || value < max;
  const display = value === null ? '—' : decimals > 0 ? value.toFixed(decimals) : String(value);

  return (
    <View style={ss.row}>
      <TouchableOpacity onPress={decrement} disabled={!canDec} style={[ss.btn, !canDec && ss.btnOff]}>
        <Text style={ss.btnTxt}>−</Text>
      </TouchableOpacity>
      <Text style={ss.val}>{display}</Text>
      <TouchableOpacity onPress={increment} disabled={!canInc} style={[ss.btn, !canInc && ss.btnOff]}>
        <Text style={ss.btnTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const ss = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 1 },
  btn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.25 },
  btnTxt: { fontSize: 15, color: '#374151', fontWeight: '700', lineHeight: 17 },
  val: { fontSize: 11, fontWeight: '700', color: '#111827', minWidth: 22, textAlign: 'center' },
});

// ── Helpers ───────────────────────────────────────────────────────
function fmt(val: number | null): string {
  return val === null ? '—' : String(val);
}

function resolveLoad(
  block: SetBlock,
  liftType: Exercise['liftType'],
  pr: LatestPR | null | undefined,
): number | null {
  if (block.load !== null && block.load !== undefined) return block.load;
  if (!block.intensity || !liftType || !pr) return null;
  const prVal = pr[liftType];
  if (!prVal) return null;
  return Math.round(prVal * block.intensity / 100);
}

// ── ExerciseCard ──────────────────────────────────────────────────
export function ExerciseCard({ exercise, blockProgress, onUpdateBlock, onEditSetBlocks, onRemove, latestPR }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState<SetBlock[]>([]);

  const title = exercise.label ? `${exercise.label}. ${exercise.name}` : exercise.name;
  const currentBlocks: SetBlock[] = exercise.setBlocks ?? [{ sets: exercise.sets ?? 3, reps: null, rpe: null, load: null }];
  const isAllDone = currentBlocks.every((block, i) => (blockProgress[i] ?? 0) >= block.sets);

  function startEdit() {
    setDraftBlocks(currentBlocks.map((b) => ({ ...b })));
    setEditing(true);
  }

  function saveEdit() {
    if (draftBlocks.some((b) => b.sets < 1)) {
      Alert.alert('Invalid', 'Sets must be at least 1.');
      return;
    }
    onEditSetBlocks?.(draftBlocks);
    setEditing(false);
  }

  function updateDraft(rowIdx: number, field: keyof SetBlock, value: number | null) {
    setDraftBlocks((prev) =>
      prev.map((b, i) => (i === rowIdx ? { ...b, [field]: value } : b)),
    );
  }

  function addRow() {
    const last = draftBlocks[draftBlocks.length - 1] ?? { sets: 3, reps: null, rpe: null, load: null };
    setDraftBlocks((prev) => [...prev, { ...last }]);
  }

  function removeRow(rowIdx: number) {
    if (draftBlocks.length <= 1) return;
    setDraftBlocks((prev) => prev.filter((_, i) => i !== rowIdx));
  }

  return (
    <View style={[styles.card, isAllDone && !editing && styles.cardDone]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {isAllDone && !editing && <Text style={styles.check}>✓ </Text>}
          <Text style={[styles.title, isAllDone && !editing && styles.titleDone]} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {!editing && onEditSetBlocks && (
            <TouchableOpacity onPress={startEdit} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {!editing && onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              style={[styles.actionBtn, styles.actionBtnRed]}
            >
              <Text style={[styles.actionBtnText, styles.actionBtnTextRed]}>Remove</Text>
            </TouchableOpacity>
          )}
          {!editing && (
            <TouchableOpacity onPress={() => Linking.openURL(exercise.youtubeUrl)}>
              <Text style={styles.watch}>▶ Watch</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {exercise.notes ? <Text style={styles.notes}>{exercise.notes}</Text> : null}

      {/* ── Edit mode ── */}
      {editing && (() => {
        const hasIntensity = draftBlocks.some(b => b.intensity);
        return (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeadCell}>Sets</Text>
            <Text style={styles.tableHeadCell}>Reps</Text>
            <Text style={styles.tableHeadCell}>RPE</Text>
            <Text style={styles.tableHeadCell}>Load</Text>
            {hasIntensity && <Text style={styles.tableHeadCellSm}>Int%</Text>}
            <View style={styles.deleteCol} />
          </View>

          {draftBlocks.map((block, i) => (
            <View key={i} style={styles.editRow}>
              <Stepper
                value={block.sets}
                onChange={(v) => updateDraft(i, 'sets', v ?? 1)}
                step={1} min={1} max={20} nullable={false}
              />
              <Stepper
                value={block.reps}
                onChange={(v) => updateDraft(i, 'reps', v)}
                step={1} min={1} max={50} nullable
              />
              <Stepper
                value={block.rpe}
                onChange={(v) => updateDraft(i, 'rpe', v)}
                step={0.5} min={1} max={10} nullable decimals={1}
              />
              <Stepper
                value={block.load}
                onChange={(v) => updateDraft(i, 'load', v)}
                step={2.5} min={0} max={500} nullable decimals={1}
              />
              {hasIntensity && (
                <Stepper
                  value={block.intensity ?? null}
                  onChange={(v) => updateDraft(i, 'intensity', v)}
                  step={1} min={1} max={200} nullable
                />
              )}
              <TouchableOpacity
                onPress={() => removeRow(i)}
                disabled={draftBlocks.length <= 1}
                style={[styles.deleteCol, styles.deleteBtn, draftBlocks.length <= 1 && { opacity: 0.2 }]}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={addRow} style={styles.addRowBtn}>
            <Text style={styles.addRowBtnText}>+ Add Row</Text>
          </TouchableOpacity>

          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        );
      })()}

      {/* ── Read-only table ── */}
      {!editing && (
        <View style={styles.table}>
          {(() => {
            const hasIntensity = currentBlocks.some(b => b.intensity);
            return (
              <>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeadCell}>Sets</Text>
                  <Text style={styles.tableHeadCell}>Reps</Text>
                  <Text style={styles.tableHeadCell}>RPE</Text>
                  <Text style={styles.tableHeadCell}>Load</Text>
                  {hasIntensity && <Text style={styles.tableHeadCellSm}>%1RM</Text>}
                  <View style={styles.actionCell} />
                </View>
                {currentBlocks.map((block, i) => {
                  const completed = blockProgress[i] ?? 0;
                  const done = completed >= block.sets;
                  return (
                    <View key={i} style={[styles.tableRow, done && styles.tableRowDone]}>
                      <Text style={styles.tableCell}>{block.sets}</Text>
                      <Text style={styles.tableCell}>{fmt(block.reps)}</Text>
                      <Text style={[styles.tableCell, styles.muted]}>{fmt(block.rpe)}</Text>
                      <Text style={[styles.tableCell, styles.muted]}>
                        {fmt(resolveLoad(block, exercise.liftType, latestPR))}
                      </Text>
                      {hasIntensity && (
                        <Text style={[styles.tableCellSm, styles.intensityCell]}>
                          {block.intensity ? `${block.intensity}%` : '—'}
                        </Text>
                      )}
                      <View style={styles.actionCell}>
                        {block.sets === 1 ? (
                          <TouchableOpacity
                            onPress={() => onUpdateBlock(i, done ? 0 : 1)}
                            style={[styles.toggleBtn, done && styles.toggleBtnDone]}
                          >
                            <Text style={[styles.toggleBtnText, done && styles.toggleBtnTextDone]}>✓</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.counter}>
                            <TouchableOpacity
                              onPress={() => onUpdateBlock(i, Math.max(0, completed - 1))}
                              disabled={completed === 0}
                              style={[styles.counterBtn, completed === 0 && styles.counterBtnDisabled]}
                            >
                              <Text style={styles.counterBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={[styles.counterLabel, done && styles.counterLabelDone]}>
                              {completed}/{block.sets}
                            </Text>
                            <TouchableOpacity
                              onPress={() => onUpdateBlock(i, Math.min(block.sets, completed + 1))}
                              disabled={done}
                              style={[styles.counterBtn, done && styles.counterBtnDisabled]}
                            >
                              <Text style={styles.counterBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            );
          })()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cardDone: { opacity: 0.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  check: { color: '#10b981', fontSize: 13, fontWeight: '700' },
  title: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  titleDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#eff6ff', borderRadius: 6 },
  actionBtnText: { color: '#3b82f6', fontSize: 11, fontWeight: '700' },
  actionBtnRed: { backgroundColor: '#fee2e2' },
  actionBtnTextRed: { color: '#ef4444' },
  watch: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  notes: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 4, marginBottom: 2 },
  tableHeadCell: { flex: 1, fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  tableHeadCellSm: { flex: 0.85, fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  // Edit mode
  editRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  deleteCol: { width: 28, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: {},
  deleteBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  addRowBtn: { marginTop: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, borderStyle: 'dashed' },
  addRowBtnText: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
  cancelBtnText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#10b981', borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Read-only
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  tableRowDone: { opacity: 0.4 },
  tableCell: { flex: 1, fontSize: 11, color: '#374151' },
  tableCellSm: { flex: 0.85, fontSize: 11, color: '#374151' },
  intensityCell: { color: '#f59e0b', fontWeight: '600' },
  muted: { color: '#9ca3af' },
  actionCell: { flex: 1.8, alignItems: 'flex-start' },
  toggleBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  toggleBtnDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  toggleBtnText: { fontSize: 11, color: '#d1d5db', fontWeight: '700' },
  toggleBtnTextDone: { color: '#fff' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  counterBtn: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  counterBtnDisabled: { opacity: 0.3 },
  counterBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '700', lineHeight: 14 },
  counterLabel: { fontSize: 11, fontWeight: '600', color: '#374151', minWidth: 28, textAlign: 'center' },
  counterLabelDone: { color: '#10b981' },
});
