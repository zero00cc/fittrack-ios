import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { CalorieHistory } from '../../types/calorie.types';
import { getLast30Days, formatShortDate } from '../../utils/dateUtils';

interface Props {
  history: CalorieHistory;
  target: number;
}

const CHART_HEIGHT = 130;
const BAR_WIDTH = 8;
const BAR_GAP = 3;
const SLOT = BAR_WIDTH + BAR_GAP;

function barColor(total: number, target: number): string {
  if (total === 0) return '#e5e7eb';
  if (total > target * 1.1) return '#ef4444';
  if (total >= target * 0.9) return '#22c55e';
  return '#3b82f6';
}

export function CalorieHistoryChart({ history, target }: Props) {
  const days = getLast30Days();
  const maxVal = Math.max(target * 1.3, ...days.map((d) => {
    const log = history[d];
    return log ? log.entries.reduce((s, e) => s + e.calories, 0) : 0;
  }));

  const totalWidth = days.length * SLOT;
  const screenW = Dimensions.get('window').width - 32;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Last 30 Days</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { width: Math.max(totalWidth, screenW) }]}
      >
        {/* Target line */}
        <View
          style={[
            styles.targetLine,
            {
              bottom: (target / maxVal) * CHART_HEIGHT,
              width: Math.max(totalWidth, screenW),
            },
          ]}
        />

        {/* Bars */}
        <View style={styles.barsRow}>
          {days.map((date, i) => {
            const log = history[date];
            const total = log ? log.entries.reduce((s, e) => s + e.calories, 0) : 0;
            const barH = total > 0 ? Math.max(3, (total / maxVal) * CHART_HEIGHT) : 2;
            const color = barColor(total, target);
            const isToday = i === days.length - 1;
            const showLabel = i === 0 || i === 7 || i === 14 || i === 21 || i === 29;

            return (
              <View key={date} style={[styles.slot, { width: SLOT }]}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      { height: barH, backgroundColor: color, width: BAR_WIDTH },
                      isToday && styles.barToday,
                    ]}
                  />
                </View>
                {showLabel && (
                  <Text style={styles.dateLabel} numberOfLines={1}>
                    {formatShortDate(date).replace(/\s\d{4}/, '').trim()}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>Low (&lt;{Math.round(target * 0.9)} kcal)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>High (&gt;{Math.round(target * 1.1)} kcal)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  scroll: { height: CHART_HEIGHT + 20 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 20, position: 'relative' },
  slot: { alignItems: 'center' },
  barContainer: { height: CHART_HEIGHT, justifyContent: 'flex-end' },
  bar: { borderRadius: 3 },
  barToday: { opacity: 1, borderWidth: 1, borderColor: '#111827' },
  targetLine: { position: 'absolute', height: 1, borderTopWidth: 1, borderTopColor: '#10b981', borderStyle: 'dashed', opacity: 0.6 },
  dateLabel: { fontSize: 8, color: '#9ca3af', marginTop: 3, width: 28, textAlign: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#6b7280' },
});
