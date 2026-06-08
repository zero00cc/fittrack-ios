import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalorieStore } from '../hooks/useCalorieStore';
import { dayTotals, calorieColor, generateId } from '../utils/calorieUtils';
import { getLast30Days, formatShortDate, toYMD, todayYMD, daysBetween } from '../utils/dateUtils';
import { MacroEntry } from '../types/calorie.types';

const MAX_DAYS_BACK = 7;

// ── Chart helpers ─────────────────────────────────────────────────────────────

function niceStep(max: number, targetTicks: number): number {
  const rough = max / targetTicks;
  const mag   = Math.pow(10, Math.floor(Math.log10(rough)));
  const n     = rough / mag;
  const nice  = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return nice * mag;
}

function fmtTick(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000) return `${+(v / 1000).toFixed(1)}k`;
  return String(v);
}

// ── 30-day bar chart ──────────────────────────────────────────────────────────

const CHART_H  = 160;   // px — bar area height
const LABEL_H  = 22;    // px — x-axis label row
const BAR_W    = 18;    // px — bar width
const BAR_SLOT = 26;    // px — slot width (bar + gap)
const Y_W      = 42;    // px — y-axis panel width

function BarChart({ history, goals }: { history: any; goals: any }) {
  const days   = getLast30Days();
  const values = days.map((d) => dayTotals(history[d]).calories);
  const maxVal = Math.max(goals.calories * 1.3, ...values, 100);

  // Y-axis ticks
  const step   = niceStep(maxVal, 4);
  const yTicks = Array.from({ length: Math.floor(maxVal / step) + 1 }, (_, i) => i * step);
  const chartW = days.length * BAR_SLOT;

  return (
    <View style={bc.wrap}>
      <Text style={bc.title}>Last 30 Days</Text>

      <View style={{ flexDirection: 'row' }}>
        {/* ── Y-axis ── */}
        <View style={{ width: Y_W, height: CHART_H, position: 'relative' }}>
          {yTicks.map((v) => (
            <Text
              key={v}
              style={[bc.yLabel, { bottom: (v / maxVal) * CHART_H - 7 }]}
            >
              {fmtTick(v)}
            </Text>
          ))}
        </View>

        {/* ── Scrollable chart ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ width: chartW, height: CHART_H + LABEL_H, position: 'relative' }}>

            {/* Gridlines */}
            {yTicks.map((v) => (
              <View
                key={v}
                style={[bc.gridLine, { bottom: LABEL_H + (v / maxVal) * CHART_H, width: chartW }]}
              />
            ))}

            {/* Goal / target line */}
            <View
              style={[
                bc.targetLine,
                { bottom: LABEL_H + Math.min(CHART_H - 1, (goals.calories / maxVal) * CHART_H), width: chartW },
              ]}
            />

            {/* Bars */}
            <View
              style={{
                flexDirection: 'row',
                alignItems:   'flex-end',
                position:     'absolute',
                bottom:       LABEL_H,
                left:         0,
                height:       CHART_H,
              }}
            >
              {days.map((date, i) => {
                const val     = values[i];
                const h       = val > 0 ? Math.max(4, Math.round((val / maxVal) * CHART_H)) : 3;
                const color   = calorieColor(val, goals.calories);
                const isToday = i === days.length - 1;
                return (
                  <View key={date} style={{ width: BAR_SLOT, alignItems: 'center' }}>
                    <View
                      style={[
                        bc.bar,
                        {
                          width:           BAR_W,
                          height:          h,
                          backgroundColor: val > 0 ? color : '#0f172a',
                          borderWidth:     isToday ? 1.5 : 0,
                          borderColor:     '#f1f5f9',
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            {/* X-axis labels — every 5 days + today */}
            <View style={{ flexDirection: 'row', position: 'absolute', bottom: 0, left: 0, height: LABEL_H }}>
              {days.map((date, i) => {
                const show = i === 0 || i % 5 === 0 || i === days.length - 1;
                return (
                  <View key={date} style={{ width: BAR_SLOT, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
                    {show && (
                      <Text style={bc.xLabel} numberOfLines={1}>
                        {formatShortDate(date).replace(/\s\d{4}/, '').trim()}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={bc.legend}>
        {([['#3b82f6', 'Under'], ['#22c55e', 'On track'], ['#ef4444', 'Over']] as const).map(([c, l]) => (
          <View key={l} style={bc.legendItem}>
            <View style={[bc.dot, { backgroundColor: c }]} />
            <Text style={bc.legendTxt}>{l}</Text>
          </View>
        ))}
        <View style={bc.legendItem}>
          <View style={bc.targetSwatch} />
          <Text style={bc.legendTxt}>Goal</Text>
        </View>
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  wrap:        { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, gap: 12 },
  title:       { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  yLabel:      { position: 'absolute', right: 4, fontSize: 9, color: '#475569', fontWeight: '600' },
  gridLine:    { position: 'absolute', left: 0, height: 1, backgroundColor: '#334155', opacity: 0.4 },
  targetLine:  { position: 'absolute', left: 0, height: 1, borderTopWidth: 1, borderTopColor: '#10b981', borderStyle: 'dashed', opacity: 0.8 },
  bar:         { borderRadius: 4 },
  xLabel:      { fontSize: 9, color: '#64748b', textAlign: 'center' },
  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 14, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  targetSwatch:{ width: 14, height: 2, backgroundColor: '#10b981', borderRadius: 1 },
  legendTxt:   { fontSize: 10, color: '#64748b' },
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

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const todayStr  = toYMD(todayDate);
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMon; d++)
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

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
          const log      = history[date];
          const hasData  = log && log.entries.length > 0;
          const color    = hasData ? calorieColor(dayTotals(log).calories, goals.calories) : null;
          const isToday  = date === todayStr;
          const isFuture = date > todayStr;
          return (
            <TouchableOpacity
              key={date}
              style={[cal.cell, isToday && cal.cellToday, isFuture && cal.cellFuture]}
              onPress={() => onDayPress(date)}
              disabled={isFuture}
            >
              <Text style={[cal.cellTxt, isToday && cal.cellTxtToday, isFuture && cal.cellTxtFuture]}>
                {parseInt(date.slice(8))}
              </Text>
              {color && !isFuture && <View style={[cal.cellDot, { backgroundColor: color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
const cal = StyleSheet.create({
  wrap:         { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, gap: 12 },
  nav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:       { padding: 8 },
  navBtnOff:    { opacity: 0.25 },
  navTxt:       { fontSize: 24, color: '#f1f5f9', fontWeight: '700' },
  monthTxt:     { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  dayLabels:    { flexDirection: 'row' },
  dayLabel:     { flex: 1, textAlign: 'center', fontSize: 10, color: '#475569', fontWeight: '600' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  cell:         { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellToday:    { backgroundColor: '#0f172a', borderRadius: 8 },
  cellTxt:      { fontSize: 13, color: '#64748b' },
  cellTxtToday: { color: '#f1f5f9', fontWeight: '700' },
  cellFuture:   { opacity: 0.2 },
  cellTxtFuture:{ color: '#334155' },
  cellDot:      { width: 5, height: 5, borderRadius: 3 },
});

// ── Edit entry form (inside day modal) ────────────────────────────────────────

function EditHistoryEntry({ entry, date, onSave, onClose }: {
  entry: MacroEntry; date: string;
  onSave: (d: string, id: string, u: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(entry.name);
  const [cal, setCal]   = useState(String(entry.calories));
  const [pro, setPro]   = useState(String(entry.protein));
  const [carb, setCarb] = useState(String(entry.carbs));
  const [fat, setFat]   = useState(String(entry.fat));

  return (
    <View style={ee.wrap}>
      <View style={ee.header}>
        <Text style={ee.title}>Edit Entry</Text>
        <TouchableOpacity onPress={onClose}><Text style={ee.close}>✕</Text></TouchableOpacity>
      </View>
      <TextInput style={ee.nameInput} value={name} onChangeText={setName} placeholderTextColor="#475569" />
      <View style={ee.macroRow}>
        {[['Cal','kcal',cal,setCal],['Prot','g',pro,setPro],['Carb','g',carb,setCarb],['Fat','g',fat,setFat]].map(([l,u,v,sv]: any) => (
          <View key={l} style={ee.field}>
            <Text style={ee.fieldLabel}>{l}</Text>
            <TextInput style={ee.fieldInput} value={v} onChangeText={sv} keyboardType="numeric" selectTextOnFocus />
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

// ── Inline add-entry form (used inside DayModal) ──────────────────────────────

function AddEntryForm({ date, onAdd, onClose }: {
  date: string; onAdd: (e: MacroEntry) => void; onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [cal,  setCal]  = useState('');
  const [pro,  setPro]  = useState('0');
  const [carb, setCarb] = useState('0');
  const [fat,  setFat]  = useState('0');

  function submit() {
    const calories = parseInt(cal);
    if (!name.trim() || !calories) return;
    onAdd({
      id: generateId(), date, timestamp: new Date().toISOString(),
      name: name.trim(), calories,
      protein: parseInt(pro) || 0, carbs: parseInt(carb) || 0, fat: parseInt(fat) || 0,
    });
    onClose();
  }

  return (
    <View style={af.wrap}>
      <View style={af.header}>
        <Text style={af.title}>Add Entry</Text>
        <TouchableOpacity onPress={onClose}><Text style={af.close}>✕</Text></TouchableOpacity>
      </View>
      <TextInput style={af.nameInput} value={name} onChangeText={setName} placeholder="Food name" placeholderTextColor="#475569" autoFocus />
      <View style={af.row}>
        {([['Kcal',cal,setCal,true],['Protein',pro,setPro,false],['Carbs',carb,setCarb,false],['Fat',fat,setFat,false]] as [string,string,(v:string)=>void,boolean][]).map(([l,v,s,req]) => (
          <View key={l} style={af.field}>
            <Text style={[af.fieldLbl, req && { color: '#10b981' }]}>{l}</Text>
            <TextInput style={af.fieldInput} value={v} onChangeText={s} keyboardType="numeric" selectTextOnFocus placeholder="0" placeholderTextColor="#334155" />
          </View>
        ))}
      </View>
      <TouchableOpacity style={[af.btn, (!name.trim()||!cal) && af.btnOff]} onPress={submit} disabled={!name.trim()||!cal}>
        <Text style={af.btnTxt}>Add to Log</Text>
      </TouchableOpacity>
    </View>
  );
}
const af = StyleSheet.create({
  wrap:      { gap: 10 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:     { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  close:     { color: '#475569', fontSize: 16, padding: 4 },
  nameInput: { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 14, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  row:       { flexDirection: 'row', gap: 6 },
  field:     { flex: 1, alignItems: 'center', gap: 3 },
  fieldLbl:  { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  fieldInput:{ backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 13, fontWeight: '700', borderRadius: 6, paddingVertical: 8, width: '100%', textAlign: 'center' },
  btn:       { backgroundColor: '#10b981', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnOff:    { backgroundColor: '#1e293b' },
  btnTxt:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ── Day detail modal — CENTERED ───────────────────────────────────────────────

function DayModal({ date, history, goals, addEntry, updateEntry, removeHistoryEntry, onClose }: {
  date: string; history: any; goals: any;
  addEntry:           (e: MacroEntry) => void;
  updateEntry:        (d: string, id: string, u: any) => void;
  removeHistoryEntry: (d: string, id: string) => void;
  onClose: () => void;
}) {
  type View = 'list' | 'edit' | 'add';
  const [view, setView]             = useState<View>('list');
  const [editingEntry, setEditing]  = useState<MacroEntry | null>(null);

  const log     = history[date] as { date: string; entries: MacroEntry[] } | undefined;
  const totals  = dayTotals(log);
  const color   = calorieColor(totals.calories, goals.calories);
  const label   = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const daysBack = daysBetween(date, todayYMD());  // positive = past, negative = future
  const canAdd   = daysBack >= 0 && daysBack <= MAX_DAYS_BACK;

  function startEdit(entry: MacroEntry) { setEditing(entry); setView('edit'); }
  function closeSubView()               { setEditing(null); setView('list'); }

  return (
    <Modal visible animationType="fade" transparent>
      <TouchableOpacity style={dm.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={dm.card} onPress={() => {}}>

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

          <View style={dm.divider} />

          {/* Content — switches between list / edit / add */}
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {view === 'add' ? (
              <AddEntryForm date={date} onAdd={addEntry} onClose={closeSubView} />
            ) : view === 'edit' && editingEntry ? (
              <EditHistoryEntry entry={editingEntry} date={date} onSave={updateEntry} onClose={closeSubView} />
            ) : (
              <>
                {!log || log.entries.length === 0 ? (
                  <Text style={dm.empty}>No meals logged this day.</Text>
                ) : (
                  log.entries.map((entry) => (
                    <View key={entry.id} style={dm.row}>
                      <View style={dm.rowInfo}>
                        <Text style={dm.rowName} numberOfLines={1}>{entry.name}</Text>
                        <Text style={dm.rowMacros}>P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g</Text>
                      </View>
                      <Text style={dm.rowKcal}>{entry.calories} kcal</Text>
                      <TouchableOpacity onPress={() => startEdit(entry)} style={dm.actionBtn}>
                        <Text style={dm.editTxt}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeHistoryEntry(date, entry.id)} style={dm.actionBtn}>
                        <Text style={dm.delTxt}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {/* Add entry button — only within 7 days */}
                {canAdd && (
                  <TouchableOpacity style={dm.addBtn} onPress={() => setView('add')}>
                    <Text style={dm.addBtnTxt}>＋  Add Entry</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const dm = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:      { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, width: '100%', gap: 12 },
  header:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  date:      { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  kcal:      { fontSize: 28, fontWeight: '900', marginTop: 4 },
  macros:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn:  { padding: 4 },
  closeTxt:  { color: '#475569', fontSize: 20 },
  divider:   { height: 1, backgroundColor: '#0f172a' },
  empty:     { fontSize: 14, color: '#475569', textAlign: 'center', paddingVertical: 24 },
  addBtn:    { marginTop: 12, backgroundColor: '#0f172a', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  addBtnTxt: { color: '#10b981', fontWeight: '700', fontSize: 14 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a', gap: 8 },
  rowInfo:   { flex: 1 },
  rowName:   { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  rowMacros: { fontSize: 11, color: '#64748b', marginTop: 2 },
  rowKcal:   { fontSize: 13, fontWeight: '800', color: '#10b981' },
  actionBtn: { padding: 6 },
  editTxt:   { color: '#64748b', fontSize: 16 },
  delTxt:    { fontSize: 15 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CalorieProgressScreen() {
  const { history, goals, loaded, addEntry, updateEntry, removeHistoryEntry } = useCalorieStore();
  const [modalDate, setModalDate] = useState<string | null>(null);

  if (!loaded) {
    return <View style={s.loading}><Text style={s.loadingTxt}>Loading…</Text></View>;
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

        <BarChart history={history} goals={goals} />

        <CalendarView history={history} goals={goals} onDayPress={setModalDate} />

        <Text style={s.tapHint}>Tap any coloured day to view and edit logged meals.</Text>

      </ScrollView>

      {modalDate && (
        <DayModal
          date={modalDate}
          history={history}
          goals={goals}
          addEntry={addEntry}
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
  tapHint:    { fontSize: 11, color: '#334155', textAlign: 'center' },
});
