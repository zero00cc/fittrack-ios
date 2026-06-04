import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Exercise } from '../../types/workout.types';

interface Props {
  exercise: Exercise;
  blockProgress: number[];
  onUpdateBlock: (blockIndex: number, newCount: number) => void;
}

function fmt(val: number | null): string {
  return val === null ? '—' : String(val);
}

export function ExerciseCard({ exercise, blockProgress, onUpdateBlock }: Props) {
  const title = exercise.label ? `${exercise.label}. ${exercise.name}` : exercise.name;

  const isAllDone = exercise.setBlocks
    ? exercise.setBlocks.every((block, i) => (blockProgress[i] ?? 0) >= block.sets)
    : (blockProgress[0] ?? 0) >= (exercise.sets ?? 1);

  return (
    <View style={[styles.card, isAllDone && styles.cardDone]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {isAllDone && <Text style={styles.check}>✓ </Text>}
          <Text style={[styles.title, isAllDone && styles.titleDone]} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <TouchableOpacity onPress={() => Linking.openURL(exercise.youtubeUrl)}>
          <Text style={styles.watch}>▶ Watch</Text>
        </TouchableOpacity>
      </View>

      {exercise.notes ? <Text style={styles.notes}>{exercise.notes}</Text> : null}

      {exercise.setBlocks && (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {['Sets', 'Reps', 'RPE', 'Load', ''].map((h, i) => (
              <Text key={i} style={[styles.tableHeadCell, i === 4 && styles.actionCell]}>{h}</Text>
            ))}
          </View>
          {exercise.setBlocks.map((block, i) => {
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
