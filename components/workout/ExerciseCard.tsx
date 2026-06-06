import { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, TextInput, Alert } from 'react-native';
import { Exercise, SetBlock } from '../../types/workout.types';

interface Props {
  exercise: Exercise;
  blockProgress: number[];
  onUpdateBlock: (blockIndex: number, newCount: number) => void;
  onEditSetBlocks?: (newBlocks: SetBlock[]) => void;
  onRemove?: () => void;
}

function fmt(val: number | null): string {
  return val === null ? '—' : String(val);
}

function parseField(text: string): number | null {
  const t = text.trim();
  if (t === '' || t === '—') return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

export function ExerciseCard({ exercise, blockProgress, onUpdateBlock, onEditSetBlocks, onRemove }: Props) {
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

  function updateDraftSets(rowIdx: number, text: string) {
    const n = Math.max(1, parseInt(text) || 1);
    setDraftBlocks((prev) => prev.map((b, i) => (i === rowIdx ? { ...b, sets: n } : b)));
  }

  function updateDraftField(rowIdx: number, field: 'reps' | 'rpe' | 'load', text: string) {
    setDraftBlocks((prev) =>
      prev.map((b, i) => (i === rowIdx ? { ...b, [field]: parseField(text) } : b)),
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {isAllDone && !editing && <Text style={styles.check}>✓ </Text>}
          <Text style={[styles.title, isAllDone && !editing && styles.titleDone]} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {!editing && onEditSetBlocks && (
            <TouchableOpacity onPress={startEdit} style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {!editing && onRemove && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Remove Exercise', `Remove "${exercise.name}" from this day?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: onRemove },
                ])
              }
              style={styles.removeBtn}
            >
              <Text style={styles.removeBtnText}>✕</Text>
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

      {/* Edit mode */}
      {editing && (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeadCell}>Sets</Text>
            <Text style={styles.tableHeadCell}>Reps</Text>
            <Text style={styles.tableHeadCell}>RPE</Text>
            <Text style={styles.tableHeadCell}>Load</Text>
            <Text style={[styles.tableHeadCell, styles.deleteCell]}> </Text>
          </View>
          {draftBlocks.map((block, i) => (
            <View key={i} style={styles.tableRow}>
              <TextInput
                style={[styles.tableCell, styles.editInput]}
                value={String(block.sets)}
                onChangeText={(t) => updateDraftSets(i, t)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TextInput
                style={[styles.tableCell, styles.editInput]}
                value={block.reps === null ? '' : String(block.reps)}
                placeholder="—"
                placeholderTextColor="#d1d5db"
                onChangeText={(t) => updateDraftField(i, 'reps', t)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TextInput
                style={[styles.tableCell, styles.editInput]}
                value={block.rpe === null ? '' : String(block.rpe)}
                placeholder="—"
                placeholderTextColor="#d1d5db"
                onChangeText={(t) => updateDraftField(i, 'rpe', t)}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <TextInput
                style={[styles.tableCell, styles.editInput]}
                value={block.load === null ? '' : String(block.load)}
                placeholder="—"
                placeholderTextColor="#d1d5db"
                onChangeText={(t) => updateDraftField(i, 'load', t)}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                onPress={() => removeRow(i)}
                disabled={draftBlocks.length <= 1}
                style={[styles.deleteCell, draftBlocks.length <= 1 && styles.disabled]}
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
      )}

      {/* Read-only table */}
      {!editing && (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {['Sets', 'Reps', 'RPE', 'Load', ''].map((h, i) => (
              <Text key={i} style={[styles.tableHeadCell, i === 4 && styles.actionCell]}>{h}</Text>
            ))}
          </View>
          {currentBlocks.map((block, i) => {
            const completed = blockProgress[i] ?? 0;
            const done = completed >= block.sets;
            return (
              <View key={i} style={[styles.tableRow, done && styles.tableRowDone]}>
                <Text style={styles.tableCell}>{block.sets}</Text>
                <Text style={styles.tableCell}>{fmt(block.reps)}</Text>
                <Text style={[styles.tableCell, styles.muted]}>{fmt(block.rpe)}</Text>
                <Text style={[styles.tableCell, styles.muted]}>{fmt(block.load)}</Text>
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
  editBtn: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#eff6ff', borderRadius: 6 },
  editBtnText: { color: '#3b82f6', fontSize: 11, fontWeight: '700' },
  removeBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#ef4444', fontSize: 10, fontWeight: '700' },
  watch: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  notes: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 4, marginBottom: 2 },
  tableHeadCell: { flex: 1, fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  tableRowDone: { opacity: 0.4 },
  tableCell: { flex: 1, fontSize: 11, color: '#374151' },
  muted: { color: '#9ca3af' },
  actionCell: { flex: 1.8, alignItems: 'flex-start' },
  // Edit mode
  editInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 3,
    fontSize: 11,
    color: '#111827',
    textAlign: 'center',
    backgroundColor: '#fff',
    marginRight: 2,
  },
  deleteCell: { flex: 0.6, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.2 },
  addRowBtn: {
    marginTop: 6,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addRowBtnText: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
  cancelBtnText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#10b981', borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Read-only counters
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
