import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalorieStore } from '../hooks/useCalorieStore';
import { dayTotals, calorieColor } from '../utils/calorieUtils';
import { getLast30Days, formatShortDate, toYMD } from '../utils/dateUtils';

const SCREEN_W = Dimensions.get('window').width;

// ── 30-day bar chart ──────────────────────────────────────────────────────────

function BarChart({ history, goals }: { history: any; goals: any }) {
  const days   = getLast30Days();
  const values = days.map((d) => dayTotals(history[d]).calories);
  const maxVal = Math.max(goals.calories * 1.3, ...values, 1);

  const CHART_H = 120;
  const barW    = Math.max(6, (SCREEN_W - 32 - 32) / days.length - 2);

  return (
    <View style={bc.wrap}>
      <Text style={bc.title}>Last 30 Days</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ height: CHART_H + 24, flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingHorizontal: 4 }}>
          {/* target line */}
          <View pointerEvents="none" style={[bc.targetLine, { bottom: (goals.calories / maxVal) * CHART_H, width: days.length * (barW + 2) + 8 }]} />
          {days.map((date, i) => {
            const val    = values[i];
            const h      = val > 0 ? Math.max(4, (val / maxVal) * CHART_H) : 3;
            const color  = calorieColor(val, goals.calories);
            const isToday = i === days.length - 1;
            const showLbl = i % 7 === 0 || i === days.length - 1;
            return (
              <View key={date} style={{ alignItems: 'center', justifyContent: 'flex-end', height: CHART_H + 24 }}>
                <View style={[bc.bar, { width: barW, height: h, backgroundColor: color, borderWidth: isToday ? 1.5 : 0, borderColor: '#f1f5f9' }]} />
                {showLbl && (
                  <Text style={bc.label} numberOfLines={1}>
                    {formatShortDate(date).replace(/\s\d{4}/, '')}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={bc.legend}>
        {[['#3b82f6','Under'], ['#22c55e','On track'], ['#ef4444','Over']].map(([c, l]) => (
          <View key={l} style={bc.legendItem}>
            <View style={[bc.dot, { backgroundColor: c }]} />
            <Text style={bc.legendTxt}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  wrap:       { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, gap: 12 },
  title:      { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  bar:        { borderRadius: 3 },
  targetLine: { position: 'absolute', height: 1, borderTopWidth: 1, borderTopColor: '#10b981', borderStyle: 'dashed', opacity: 0.5, left: 0 },
  label:      { fontSize: 8, color: '#475569', marginTop: 4, width: 28, textAlign: 'center' },
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  legendTxt:  { fontSize: 11, color: '#64748b' },
});

// ── Calendar ──────────────────────────────────────────────────────────────────

function CalendarView({ history, goals, selectedDate, onSelect }: {
  history: any; goals: any; selectedDate: string | null; onSelect: (d: string) => void;
}) {
  const today     = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() {
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    if (isCurrentMonth) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  const firstDay   = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMon  = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMon; d++) {
    const m  = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${year}-${m}-${dd}`);
  }

  return (
    <View style={cal.wrap}>
      <View style={cal.nav}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}><Text style={cal.navTxt}>‹</Text></TouchableOpacity>
        <Text style={cal.monthTxt}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} style={[cal.navBtn, isCurrentMonth && cal.navBtnOff]}>
          <Text style={[cal.navTxt, isCurrentMonth && { color: '#334155' }]}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={cal.dayLabels}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <Text key={i} style={cal.dayLabel}>{d}</Text>
        ))}
      </View>
      <View style={cal.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`empty-${i}`} style={cal.cell} />;
          const log    = history[date];
          const total  = dayTotals(log).calories;
          const color  = log ? calorieColor(total, goals.calories) : null;
          const isToday= date === toYMD(today);
          const isSel  = date === selectedDate;
          const d      = parseInt(date.slice(8));
          return (
            <TouchableOpacity key={date} style={[cal.cell, isSel && cal.cellSel, isToday && cal.cellToday]} onPress={() => onSelect(date)}>
              <Text style={[cal.cellTxt, isSel && cal.cellTxtSel]}>{d}</Text>
              {color && <View style={[cal.dot, { backgroundColor: color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  wrap:       { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, gap: 12 },
  nav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:     { padding: 8 },
  navBtnOff:  { opacity: 0.3 },
  navTxt:     { fontSize: 22, color: '#f1f5f9', fontWeight: '700' },
  monthTxt:   { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  dayLabels:  { flexDirection: 'row' },
  dayLabel:   { flex: 1, textAlign: 'center', fontSize: 11, color: '#475569', fontWeight: '600' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell:       { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellSel:    { backgroundColor: '#10b981', borderRadius: 8 },
  cellToday:  { borderWidth: 1, borderColor: '#334155', borderRadius: 8 },
  cellTxt:    { fontSize: 13, color: '#94a3b8' },
  cellTxtSel: { color: '#fff', fontWeight: '700' },
  dot:        { width: 5, height: 5, borderRadius: 3 },
});

// ── Selected day detail ───────────────────────────────────────────────────────

function DayDetail({ date, history, goals }: { date: string; history: any; goals: any }) {
  const log    = history[date];
  const totals = dayTotals(log);
  const label  = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const color  = calorieColor(totals.calories, goals.calories);

  return (
    <View style={dd.wrap}>
      <Text style={dd.date}>{label}</Text>
      <View style={dd.summary}>
        <Text style={[dd.kcal, { color }]}>{totals.calories} kcal</Text>
        <Text style={dd.macros}>P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g</Text>
      </View>
      {(!log || log.entries.length === 0) ? (
        <Text style={dd.empty}>No meals logged this day.</Text>
      ) : (
        log.entries.map((e: any) => (
          <View key={e.id} style={dd.row}>
            <Text style={dd.name} numberOfLines={1}>{e.name}</Text>
            <Text style={dd.entryKcal}>{e.calories} kcal</Text>
          </View>
        ))
      )}
    </View>
  );
}

const dd = StyleSheet.create({
  wrap:     { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, gap: 8 },
  date:     { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  summary:  { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 4 },
  kcal:     { fontSize: 22, fontWeight: '900' },
  macros:   { fontSize: 12, color: '#64748b' },
  empty:    { fontSize: 13, color: '#475569', paddingVertical: 8 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#0f172a' },
  name:     { fontSize: 13, color: '#94a3b8', flex: 1 },
  entryKcal:{ fontSize: 13, fontWeight: '700', color: '#f1f5f9' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CalorieProgressScreen() {
  const { history, goals, loaded } = useCalorieStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(toYMD(new Date()));

  if (!loaded) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingTxt}>Loading…</Text>
      </View>
    );
  }

  // 30-day stats
  const days30   = getLast30Days();
  const logged30 = days30.filter((d) => history[d]?.entries.length > 0).length;
  const avgKcal  = logged30 > 0
    ? Math.round(days30.reduce((sum, d) => sum + dayTotals(history[d]).calories, 0) / logged30)
    : 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* 30-day summary chips */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statNum}>{logged30}</Text>
            <Text style={s.statLbl}>days logged</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statNum}>{avgKcal}</Text>
            <Text style={s.statLbl}>avg kcal/day</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statNum}>{goals.calories}</Text>
            <Text style={s.statLbl}>daily goal</Text>
          </View>
        </View>

        {/* Bar chart */}
        <BarChart history={history} goals={goals} />

        {/* Calendar */}
        <CalendarView
          history={history}
          goals={goals}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />

        {/* Selected day detail */}
        {selectedDate && (
          <DayDetail date={selectedDate} history={history} goals={goals} />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#111827' },
  loading:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  loadingTxt: { color: '#64748b', fontSize: 15 },
  scroll:     { padding: 16, gap: 12, paddingBottom: 32 },

  statsRow:   { flexDirection: 'row', gap: 8 },
  statChip:   { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  statNum:    { fontSize: 22, fontWeight: '900', color: '#10b981' },
  statLbl:    { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 },
});
