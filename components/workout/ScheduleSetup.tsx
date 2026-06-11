import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkoutPlan } from '../../types/workout.types';
import { todayYMD } from '../../utils/dateUtils';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface Props {
  plan: WorkoutPlan;
  onConfirm: (dateMap: { [dateYMD: string]: number }) => void;
  onCancel: () => void;
}

function fmtDate(dateYMD: string) {
  return new Date(dateYMD + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function ScheduleSetup({ plan, onConfirm, onCancel }: Props) {
  const trainingDays = plan.days.filter((d) => !d.isRestDay);
  const trainingDayNumbers = trainingDays.map((d) => d.dayNumber);

  const today = todayYMD();
  const [year, setYear]   = useState(() => parseInt(today.slice(0, 4)));
  const [month, setMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);

  // date → planDayNumber
  const [dateMap, setDateMap] = useState<{ [date: string]: number }>({});
  // which planDayNumber is currently being assigned
  const [activeDayNum, setActiveDayNum] = useState<number>(trainingDayNumbers[0]);

  // reverse: planDayNumber → date
  const assigned: { [dn: number]: string } = {};
  Object.entries(dateMap).forEach(([d, dn]) => { assigned[dn] = d; });

  const scheduledCount = Object.keys(dateMap).length;
  const allScheduled   = scheduledCount === trainingDays.length;

  function seqOf(dn: number) {
    return trainingDayNumbers.indexOf(dn) + 1;
  }

  function nextUnscheduled(after: { [date: string]: number }): number {
    const done = new Set(Object.values(after));
    return trainingDayNumbers.find((dn) => !done.has(dn)) ?? trainingDayNumbers[trainingDayNumbers.length - 1];
  }

  function handleDateTap(dateYMD: string) {
    const existing = dateMap[dateYMD];
    if (existing !== undefined) {
      // Tap on already-assigned date → clear it and re-select that day
      const next = { ...dateMap };
      delete next[dateYMD];
      setDateMap(next);
      setActiveDayNum(existing);
    } else {
      // Assign activeDayNum to this date (remove any prior assignment for activeDayNum first)
      const next = { ...dateMap };
      Object.keys(next).forEach((d) => { if (next[d] === activeDayNum) delete next[d]; });
      next[dateYMD] = activeDayNum;
      setDateMap(next);
      setActiveDayNum(nextUnscheduled(next));
    }
  }

  // Build calendar grid
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const flat: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (flat.length % 7 !== 0) flat.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < flat.length; i += 7) rows.push(flat.slice(i, i + 7));
  const pad = (n: number) => String(n).padStart(2, '0');

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{plan.name}</Text>
        <TouchableOpacity
          onPress={() => onConfirm(dateMap)}
          disabled={scheduledCount === 0}
          style={[styles.startBtn, scheduledCount === 0 && styles.startBtnOff]}
        >
          <Text style={styles.startBtnText}>
            {allScheduled ? 'Start Plan' : `Start (${scheduledCount}/${trainingDays.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Instruction */}
        <View style={styles.hintBox}>
          <Text style={styles.hint}>
            Tap any date to schedule{' '}
            <Text style={styles.hintBold}>
              Day {seqOf(activeDayNum)} — {trainingDays.find((d) => d.dayNumber === activeDayNum)?.label ?? ''}
            </Text>
            {'\n'}Tap a day in the list to switch which day you're placing.
          </Text>
        </View>

        {/* ── Calendar ── */}
        <View style={styles.cal}>
          <View style={styles.nav}>
            <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            {DOW.map((d) => (
              <View key={d} style={styles.cell}>
                <Text style={styles.dowLabel}>{d}</Text>
              </View>
            ))}
          </View>

          {rows.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={styles.cell} />;
                const dateYMD   = `${year}-${pad(month + 1)}-${pad(day)}`;
                const isToday   = dateYMD === today;
                const assignedDn = dateMap[dateYMD];
                const isAssigned = assignedDn !== undefined;
                const seq        = isAssigned ? seqOf(assignedDn) : null;

                return (
                  <TouchableOpacity
                    key={dateYMD}
                    style={styles.cell}
                    onPress={() => handleDateTap(dateYMD)}
                    activeOpacity={0.65}
                  >
                    <View style={[
                      styles.circle,
                      isAssigned && styles.circleAssigned,
                      !isAssigned && isToday && styles.circleToday,
                    ]}>
                      {seq !== null
                        ? <Text style={styles.seqText}>{seq}</Text>
                        : <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{day}</Text>
                      }
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Training days list ── */}
        <Text style={styles.sectionTitle}>Training Days</Text>
        <ScrollView
          style={styles.daysListScroll}
          contentContainerStyle={styles.daysListContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {trainingDays.map((day, idx) => {
            const dn         = day.dayNumber;
            const dateForDay = assigned[dn];
            const isActive   = activeDayNum === dn;

            return (
              <TouchableOpacity
                key={dn}
                style={[styles.dayRow, isActive && styles.dayRowActive]}
                onPress={() => setActiveDayNum(dn)}
                activeOpacity={0.75}
              >
                <View style={[styles.badge, dateForDay ? styles.badgeDone : isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, (dateForDay || isActive) && styles.badgeTextLight]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayLabel} numberOfLines={1}>{day.label}</Text>
                  {dateForDay
                    ? <Text style={styles.dateAssigned}>{fmtDate(dateForDay)}</Text>
                    : <Text style={styles.dateEmpty}>
                        {isActive ? 'Tap a date on the calendar ↑' : 'Not scheduled'}
                      </Text>
                  }
                </View>
                {isActive && <Text style={styles.activeArrow}>→</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const CIRCLE = 34;
const CELL_H = 42;

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cancelText:   { color: '#6b7280', fontSize: 15, minWidth: 56 },
  headerTitle:  { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center', marginHorizontal: 8 },
  startBtn:     { backgroundColor: '#10b981', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, minWidth: 56, alignItems: 'center' },
  startBtnOff:  { backgroundColor: '#d1d5db' },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  hintBox: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 12 },
  hint:     { fontSize: 13, color: '#374151', lineHeight: 19 },
  hintBold: { fontWeight: '700', color: '#111827' },

  cal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  nav:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  navArrow:    { fontSize: 24, fontWeight: '600', color: '#374151', lineHeight: 28 },
  monthLabel:  { fontSize: 15, fontWeight: '700', color: '#111827' },
  row:         { flexDirection: 'row' },
  cell:        { flex: 1, height: CELL_H, alignItems: 'center', justifyContent: 'center' },
  dowLabel:    { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
  circle:      { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  circleAssigned: { backgroundColor: '#10b981' },
  circleToday:    { borderWidth: 2, borderColor: '#6366f1' },
  seqText:     { fontSize: 13, fontWeight: '700', color: '#fff' },
  dayNum:      { fontSize: 13, fontWeight: '600', color: '#374151' },
  dayNumToday: { color: '#6366f1' },

  sectionTitle:    { fontSize: 14, fontWeight: '700', color: '#111827' },
  daysListScroll:  { maxHeight: 280 },
  daysListContent: { gap: 8, paddingBottom: 2 },

  dayRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  dayRowActive: { borderWidth: 1.5, borderColor: '#10b981' },

  badge:          { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  badgeDone:      { backgroundColor: '#10b981' },
  badgeActive:    { backgroundColor: '#6366f1' },
  badgeText:      { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  badgeTextLight: { color: '#fff' },

  dayLabel:     { fontSize: 13, fontWeight: '600', color: '#111827' },
  dateAssigned: { fontSize: 11, color: '#10b981', fontWeight: '600', marginTop: 2 },
  dateEmpty:    { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  activeArrow:  { fontSize: 16, color: '#10b981', fontWeight: '700' },
});
