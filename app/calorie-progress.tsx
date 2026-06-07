import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Dimensions, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalorieStore } from '../hooks/useCalorieStore';
import { dayTotals, calorieColor } from '../utils/calorieUtils';
import { getLast30Days, formatShortDate, toYMD } from '../utils/dateUtils';
import { MacroEntry } from '../types/calorie.types';

const SCREEN_W = Dimensions.get('window').width;

// ── 30-day bar chart (fixed layout) ──────────────────────────────────────────

function BarChart({ history, goals }: { history: any; goals: any }) {
  const CHART_H  = 130;
  const LABEL_H  = 20;
  const days     = getLast30Days();
  const values   = days.map((d) => dayTotals(history[d]).calories);
  const maxVal   = Math.max(goals.calories * 1.35, ...values, 1);
  // Fixed bar width so all 30 fit on screen without scrolling
  const barW     = Math.floor((SCREEN_W - 48) / days.length) - 1;

  return (
    <View style={bc.wrap}>
      <Text style={bc.title}>Last 30 Days</Text>
      {/* Bar area with target line overlay */}
      <View style={{ height: CHART_H, position: 'relative' }}>
        {/* Target line — correctly positioned within bar area */}
        <View style={[bc.targetLine, { bottom: Math.min(CHART_H - 1, (goals.calories / maxVal) * CHART_H) }]} />
        {/* Bars */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 1 }}>
          {days.map((date, i) => {
            const val     = values[i];
            const h       = val > 0 ? Math.max(4, Math.round((val / maxVal) * CHART_H)) : 3;
            const color   = calorieColor(val, goals.calories);
            const isToday = i === days.length - 1;
            return (
              <View
                key={date}
                style={[
                  bc.bar,
                  {
                    width:           barW,
                    height:          h,
                    backgroundColor: val > 0 ? color : '#1e293b',
                    borderWidth:     isToday ? 1.5 : 0,
                    borderColor:     '#f1f5f9',
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
      {/* Label row — completely separate, no height interference with bars */}
      <View style={{ flexDirection: 'row', gap: 1, marginTop: 4 }}>
        {days.map((date, i) => (
          <View key={date} style={{ width: barW, alignItems: 'center' }}>
            {(i === 0 || i % 7 === 0 || i === days.length - 1) && (
              <Text style={bc.label} numberOfLines={1}>
                {formatShortDate(date).replace(/\s\d{4}/, '').trim()}
              </Text>
            )}
          </View>
        ))}
      </View>
      {/* Legend */}
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
  wrap:       { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, gap: 10 },
  title:      { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  bar:        { borderRadius: 3 },
  targetLine: { position: 'absolute', left: 0, right: 0, height: 1, borderTopWidth: 1, borderTopColor: '#10b981', borderStyle: 'dashed', opacity: 0.7 },
  label:      { fontSize: 7, color: '#475569', textAlign: 'center' },
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  legendTxt:  { fontSize: 10, color: '#64748b' },
});

// ── Calendar ──────────────────────────────────────────────────────────────────

function CalendarView({ history, goals, onDayPress }: {
  history: any; goals: any; onDayPress: (date: string) => void;
}) {
  const todayDate = new Date();
  const [year,  setYear]  = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());

  const isCurrentMonth = year === todayDate.getFullYear() && month === todayDate.getMonth();

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() {
    if (isCurrentMonth) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMon  = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr   = toYMD(todayDate);

  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMon; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  return (
    <View style={cal.wrap}>
      <View style={cal.nav}>
        <TouchableOpacity onPress={prev} style={cal.navBtn}><Text style={cal.navTxt}>‹</Text></TouchableOpacity>
        <Text style={cal.monthTxt}>{monthLabel}</Text>
        <TouchableOpacity onPress={next} style={[cal.navBtn, isCurrentMonth && cal.navBtnOff]}>
          <Text style={[cal.navTxt, isCurrentMonth && { color: '#334155' }]}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={cal.dayLabels}>
        {['S','M','T','W','T','F','S'].map((d, i) => <Text key={i} style={cal.dayLabel}>{d}</Text>)}
      </View>
      <View style={cal.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={cal.cell} />;
          const log     = history[date];
          const total   = dayTotals(log).calories;
          const hasData = log && log.entries.length > 0;
          const color   = hasData ? calorieColor(total, goals.calories) : null;
          const isToday = date === todayStr;
          const day     = parseInt(date.slice(8));
          return (
            <TouchableOpacity key={date} style={[cal.cell, isToday && cal.cellToday]} onPress={() => onDayPress(date)}>
              <Text style={[cal.cellTxt, isToday && cal.cellTxtToday]}>{day}</Text>
              {color && <View style={[cal.cellDot, { backgroundColor: color }]} />}
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
  navBtnOff:  { opacity: 0.25 },
  navTxt:     { fontSize: 24, color: '#f1f5f9', fontWeight: '700' },
  monthTxt:   { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  dayLabels:  { flexDirection: 'row' },
  dayLabel:   { flex: 1, textAlign: 'center', fontSize: 10, color: '#475569', fontWeight: '600' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell:       { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellToday:  { backgroundColor: '#0f172a', borderRadius: 8 },
  cellTxt:    { fontSize: 13, color: '#64748b' },
  cellTxtToday:{ color: '#f1f5f9', fontWeight: '700' },
  cellDot:    { width: 5, height: 5, borderRadius: 3 },
});

// ── Edit entry modal (for history entries) ────────────────────────────────────

function EditHistoryEntry({ entry, date, onSave, onClose }: {
  entry: MacroEntry; date: string;
  onSave: (d: string, id: string, u: any) => void;
  onClose: () => void;
}) {
  const [name, setName]   = useState(entry.name);
  const [cal, setCal]     = useState(String(entry.calories));
  const [pro, setPro]     = useState(String(entry.protein));
  const [carb, setCarb]   = useState(String(entry.carbs));
  const [fat, setFat]     = useState(String(entry.fat));

  return (
    <View style={ee.wrap}>
      <View style={ee.header}>
        <Text style={ee.title}>Edit Entry</Text>
        <TouchableOpacity onPress={onClose}><Text style={ee.close}>✕</Text></TouchableOpacity>
      </View>
      <TextInput style={ee.nameInput} value={name} onChangeText={setName} placeholderTextColor="#475569" />
      <View style={ee.macroRow}>
        {[['Cal','kcal',cal,setCal],['Prot','g',pro,setPro],['Carb','g',carb,setCarb],['Fat','g',fat,setFat]].map(([l,u,v,s]: any) => (
          <View key={l} style={ee.field}>
            <Text style={ee.fieldLabel}>{l}</Text>
            <TextInput style={ee.fieldInput} value={v} onChangeText={s} keyboardType="numeric" selectTextOnFocus />
            <Text style={ee.fieldUnit}>{u}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={ee.saveBtn} onPress={() => {
        onSave(date, entry.id, { name, calories: parseInt(cal)||entry.calories, protein: parseInt(pro)||entry.protein, carbs: parseInt(carb)||entry.carbs, fat: parseInt(fat)||entry.fat });
        onClose();
      }}>
        <Text style={ee.saveTxt}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}
const ee = StyleSheet.create({
  wrap:       { gap: 12 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  close:      { color: '#475569', fontSize: 16, padding: 4 },
  nameInput:  { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 14, fontWeight: '600', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  macroRow:   { flexDirection: 'row', gap: 8 },
  field:      { flex: 1, alignItems: 'center', gap: 3 },
  fieldLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  fieldInput: { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 14, fontWeight: '700', borderRadius: 8, paddingVertical: 8, width: '100%', textAlign: 'center' },
  fieldUnit:  { fontSize: 9, color: '#475569' },
  saveBtn:    { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveTxt:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Day detail popup modal ────────────────────────────────────────────────────

function DayModal({ date, history, goals, updateEntry, removeHistoryEntry, onClose }: {
  date: string; history: any; goals: any;
  updateEntry: (d: string, id: string, u: any) => void;
  removeHistoryEntry: (d: string, id: string) => void;
  onClose: () => void;
}) {
  const [editingEntry, setEditing] = useState<MacroEntry | null>(null);
  const log    = history[date] as { date: string; entries: MacroEntry[] } | undefined;
  const totals = dayTotals(log);
  const color  = calorieColor(totals.calories, goals.calories);
  const label  = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  function confirmDelete(entry: MacroEntry) {
    Alert.alert('Delete entry?', entry.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeHistoryEntry(date, entry.id) },
    ]);
  }

  return (
    <Modal visible animationType="slide" transparent>
      <View style={dm.overlay}>
        <View style={dm.sheet}>
          {/* Header */}
          <View style={dm.header}>
            <View style={{ flex: 1 }}>
              <Text style={dm.date}>{label}</Text>
              <Text style={[dm.kcal, { color }]}>{totals.calories.toLocaleString()} kcal</Text>
              <Text style={dm.macros}>P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
              <Text style={dm.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            {!log || log.entries.length === 0 ? (
              <Text style={dm.empty}>No meals logged this day.</Text>
            ) : editingEntry ? (
              <EditHistoryEntry
                entry={editingEntry}
                date={date}
                onSave={updateEntry}
                onClose={() => setEditing(null)}
              />
            ) : (
              log.entries.map((entry) => (
                <View key={entry.id} style={dm.row}>
                  <View style={dm.rowInfo}>
                    <Text style={dm.rowName} numberOfLines={1}>{entry.name}</Text>
                    <Text style={dm.rowMacros}>P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g</Text>
                  </View>
                  <Text style={dm.rowKcal}>{entry.calories}</Text>
                  <TouchableOpacity onPress={() => setEditing(entry)} style={dm.actionBtn}>
                    <Text style={dm.editTxt}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(entry)} style={dm.actionBtn}>
                    <Text style={dm.delTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const dm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, paddingBottom: 36 },
  header:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  date:      { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  kcal:      { fontSize: 28, fontWeight: '900', marginTop: 2 },
  macros:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn:  { padding: 6 },
  closeTxt:  { color: '#475569', fontSize: 20 },
  empty:     { fontSize: 14, color: '#475569', textAlign: 'center', paddingVertical: 24 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a', gap: 8 },
  rowInfo:   { flex: 1 },
  rowName:   { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  rowMacros: { fontSize: 11, color: '#64748b', marginTop: 2 },
  rowKcal:   { fontSize: 14, fontWeight: '800', color: '#10b981' },
  actionBtn: { padding: 6 },
  editTxt:   { color: '#64748b', fontSize: 16 },
  delTxt:    { color: '#475569', fontSize: 16 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CalorieProgressScreen() {
  const { history, goals, loaded, updateEntry, removeHistoryEntry } = useCalorieStore();
  const [modalDate, setModalDate] = useState<string | null>(null);

  if (!loaded) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingTxt}>Loading…</Text>
      </View>
    );
  }

  const days30   = getLast30Days();
  const logged30 = days30.filter((d) => (history[d]?.entries?.length ?? 0) > 0).length;
  const avgKcal  = logged30 > 0
    ? Math.round(days30.reduce((sum, d) => sum + dayTotals(history[d]).calories, 0) / logged30)
    : 0;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Summary chips */}
        <View style={s.statsRow}>
          <View style={s.chip}><Text style={s.chipNum}>{logged30}</Text><Text style={s.chipLbl}>days logged</Text></View>
          <View style={s.chip}><Text style={s.chipNum}>{avgKcal}</Text><Text style={s.chipLbl}>avg kcal/day</Text></View>
          <View style={s.chip}><Text style={s.chipNum}>{goals.calories.toLocaleString()}</Text><Text style={s.chipLbl}>daily goal</Text></View>
        </View>

        {/* Fixed bar chart */}
        <BarChart history={history} goals={goals} />

        {/* Calendar — tap a day to open popup */}
        <CalendarView
          history={history}
          goals={goals}
          onDayPress={(date) => setModalDate(date)}
        />

        <Text style={s.tapHint}>Tap any coloured day to view and edit logged meals.</Text>

      </ScrollView>

      {/* Day detail popup */}
      {modalDate && (
        <DayModal
          date={modalDate}
          history={history}
          goals={goals}
          updateEntry={updateEntry}
          removeHistoryEntry={removeHistoryEntry}
          onClose={() => setModalDate(null)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#111827' },
  loading:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  loadingTxt: { color: '#64748b', fontSize: 15 },
  scroll:     { padding: 16, gap: 12, paddingBottom: 32 },
  statsRow:   { flexDirection: 'row', gap: 8 },
  chip:       { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  chipNum:    { fontSize: 22, fontWeight: '900', color: '#10b981' },
  chipLbl:    { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 },
  tapHint:    { fontSize: 11, color: '#334155', textAlign: 'center', paddingHorizontal: 16 },
});
