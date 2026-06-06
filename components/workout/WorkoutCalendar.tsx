import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlanProgress } from '../../types/workout.types';
import { todayYMD, getTrainingDates } from '../../utils/dateUtils';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type CellColor = 'green' | 'red' | 'orange' | 'upcoming' | null;

interface Props {
  progress: PlanProgress;
  // Plan dayNumbers for each training day in order (e.g. [1,2,4,5])
  trainingDayNumbers: number[];
  onPressDay: (dayNumber: number) => void;
}

export function WorkoutCalendar({ progress, trainingDayNumbers, onPressDay }: Props) {
  const today = todayYMD();
  const todayParts = today.split('-').map(Number);
  const [year, setYear] = useState(todayParts[0]);
  const [month, setMonth] = useState(todayParts[1] - 1); // 0-indexed

  // Build the effective date→dayNumber map once
  const effectiveDateMap = useMemo<{ [dateYMD: string]: number }>(() => {
    if ((progress.mode ?? 'daily') === 'scheduled' && progress.dateMap) {
      return progress.dateMap;
    }
    // daily: compute expected training dates from the plan schedule
    const dates = getTrainingDates(progress.startDate, progress.weeklySchedule, trainingDayNumbers.length);
    const map: { [date: string]: number } = {};
    dates.forEach((date, i) => {
      if (i < trainingDayNumbers.length) map[date] = trainingDayNumbers[i];
    });
    return map;
  }, [progress.mode, progress.dateMap, progress.startDate, progress.weeklySchedule, trainingDayNumbers]);

  // Invert completionDates to date→dayNumber for O(1) lookup
  const completionDateMap = useMemo<{ [dateYMD: string]: number }>(() => {
    const map: { [date: string]: number } = {};
    Object.entries(progress.completionDates ?? {}).forEach(([dn, date]) => {
      map[date] = parseInt(dn);
    });
    return map;
  }, [progress.completionDates]);

  function getCellInfo(dateYMD: string): { dayNumber: number | null; color: CellColor } {
    const mode = progress.mode ?? 'daily';

    if (mode === 'scheduled') {
      const dayNumber = effectiveDateMap[dateYMD];
      if (!dayNumber) return { dayNumber: null, color: null };
      const status = progress.dayStatus[dayNumber] ?? 'unfinished';
      if (status === 'finished') return { dayNumber, color: 'green' };
      if (status === 'skipped') return { dayNumber, color: 'orange' };
      if (dateYMD < today) return { dayNumber, color: 'red' };
      return { dayNumber, color: 'upcoming' };
    }

    // daily mode — actual completions take priority
    if (completionDateMap[dateYMD] !== undefined) {
      const dn = completionDateMap[dateYMD];
      const status = progress.dayStatus[dn] ?? 'finished';
      return { dayNumber: dn, color: status === 'skipped' ? 'orange' : 'green' };
    }

    // expected dates for daily mode
    const dayNumber = effectiveDateMap[dateYMD];
    if (!dayNumber) return { dayNumber: null, color: null };
    if (dateYMD < today) return { dayNumber, color: 'red' };
    return { dayNumber, color: 'upcoming' };
  }

  // Build calendar grid for current month
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.dowRow}>
        {DOW.map((d) => (
          <Text key={d} style={styles.dowLabel}>{d}</Text>
        ))}
      </View>

      {/* Date grid */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`pad-${idx}`} style={styles.cell} />;

          const dateYMD = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isToday = dateYMD === today;
          const { dayNumber, color } = getCellInfo(dateYMD);

          const bgColor =
            color === 'green' ? '#10b981'
            : color === 'red' ? '#ef4444'
            : color === 'orange' ? '#f59e0b'
            : 'transparent';

          const textColor =
            color === 'green' || color === 'red' || color === 'orange' ? '#fff'
            : isToday ? '#6366f1'
            : '#374151';

          return (
            <TouchableOpacity
              key={dateYMD}
              style={styles.cell}
              onPress={() => dayNumber !== null && onPressDay(dayNumber)}
              disabled={dayNumber === null}
              activeOpacity={dayNumber !== null ? 0.7 : 1}
            >
              <View style={[
                styles.circle,
                { backgroundColor: bgColor },
                color === 'upcoming' && styles.circleUpcoming,
                isToday && color === null && styles.circleToday,
              ]}>
                <Text style={[styles.dayNum, { color: textColor }]}>{day}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {([
          ['#10b981', 'Done'],
          ['#ef4444', 'Missed'],
          ['#f59e0b', 'Skipped'],
          ['#93c5fd', 'Upcoming'],
        ] as [string, string][]).map(([c, label]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c }]} />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const CIRCLE = 36;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navArrow: { fontSize: 24, fontWeight: '600', color: '#374151', lineHeight: 28 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dowRow: { flexDirection: 'row', marginBottom: 2 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleUpcoming: {
    borderWidth: 1.5,
    borderColor: '#93c5fd',
  },
  circleToday: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  dayNum: { fontSize: 13, fontWeight: '600' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: '#6b7280' },
});
