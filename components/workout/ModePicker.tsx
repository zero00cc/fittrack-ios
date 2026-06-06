import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlanMode } from '../../types/workout.types';

interface Props {
  visible: boolean;
  planName: string;
  onSelect: (mode: PlanMode) => void;
  onCancel: () => void;
}

export function ModePicker({ visible, planName, onSelect, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.subtitle}>How would you like to track</Text>
          <Text style={styles.planName} numberOfLines={2}>{planName}?</Text>

          <TouchableOpacity
            style={styles.option}
            onPress={() => onSelect('scheduled')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionIcon}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Schedule All at Once</Text>
              <Text style={styles.optionDesc}>
                Auto-map every workout to a calendar date. See your full training plan at a glance and track what you've done vs. missed.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => onSelect('daily')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionIcon}>✍️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Day by Day</Text>
              <Text style={styles.optionDesc}>
                Log each workout as you go. The calendar fills in with green and red as you train through the plan.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  optionIcon: { fontSize: 26, marginTop: 1 },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  optionDesc: { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  cancelBtn: { alignItems: 'center', paddingVertical: 6 },
  cancelText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
});
