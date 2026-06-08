import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCalorieStore } from '../hooks/useCalorieStore';
import { dayTotals, calorieColor, generateId } from '../utils/calorieUtils';
import { getLast30Days, formatShortDate, toYMD, todayYMD, daysBetween } from '../utils/dateUtils';
import { MacroEntry } from '../types/calorie.types';
import {
  BG, CARD, CARD2, BORDER, TEXT, MUTED, DIM,
  ACCENT, ACCENT_SOFT, ACCENT_MID, ACCENT_DARK, SERIF,
} from '../constants/theme';

const MAX_DAYS_BACK = 7;
const WEIGHT_KEY    = 'fittrack_weight_log';

type WeightLog = Record<string, number>; // { YYYY-MM-DD: kg }

// ── Helpers ───────────────────────────────────────────────────────────────────

function niceStep(max: number, ticks: number): number {
  const rough = max / ticks;
  const mag   = Math.pow(10, Math.floor(Math.log10(rough)));
  const n     = rough / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}
function fmtTick(v: number): string {
  return v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v);
}

// ── Calorie line chart ────────────────────────────────────────────────────────

const CHART_H = 150; const Y_W = 44; const X_AXIS_H = 18;

// Shared chart styles (used by both calorie and weight charts)
const bc = StyleSheet.create({
  wrap:       { backgroundColor: CARD, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: BORDER },
  title:      { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  yLabel:     { position: 'absolute', right: 6, fontSize: 9, color: MUTED, fontWeight: '600' },
  goalTick:   { position: 'absolute', right: 0, width: 6, height: 1, backgroundColor: ACCENT },
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  legendTxt:  { fontSize: 10, color: MUTED },
});

function CalorieLineChart({ history, goals }: { history: any; goals: any }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: false }); }, []);

  const days     = getLast30Days();
  const goalKcal = goals.calories > 0 ? goals.calories : 2000;
  const values   = days.map((d) => dayTotals(history[d]).calories);
  const withData = values.filter((v) => v > 0);

  const maxVal = Math.max(goalKcal * 1.25, ...withData, 100);
  const rng    = maxVal;

  function toY(v: number) { return CHART_H - (v / rng) * CHART_H; }

  const pts = days.map((d, i) => {
    const v = values[i];
    return v > 0 ? { x: i * W_SLOT + W_SLOT / 2, y: toY(v), v, date: d } : null;
  });

  const step   = niceStep(maxVal, 4);
  const yTicks = Array.from({ length: Math.floor(maxVal / step) + 1 }, (_, i) => i * step);
  const goalY  = toY(goalKcal);

  return (
    <View style={bc.wrap}>
      <Text style={bc.title}>30-Day Calories</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: Y_W }}>
          <View style={{ height: CHART_H, position: 'relative' }}>
            {yTicks.map((v) => (
              <Text key={v} style={[bc.yLabel, { bottom: Math.max(0, Math.round((v / rng) * CHART_H) - 7) }]}>
                {fmtTick(v)}
              </Text>
            ))}
            <View style={[bc.goalTick, { bottom: Math.round((goalKcal / rng) * CHART_H) }]} />
          </View>
          <View style={{ height: X_AXIS_H }} />
        </View>
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ width: days.length * W_SLOT }}>
            <View style={{ height: CHART_H, position: 'relative' }}>
              <View style={{
                position: 'absolute', left: 0, width: days.length * W_SLOT,
                top: goalY, height: 1, backgroundColor: ACCENT, opacity: 0.25,
              }} />
              {pts.map((pt, i) => {
                if (!pt) return null;
                const next = pts.slice(i + 1).find((p) => p !== null);
                if (!next) return null;
                return <LineSeg key={`l${i}`} x1={pt.x} y1={pt.y} x2={next.x} y2={next.y} />;
              })}
              {pts.map((pt, i) => {
                if (!pt) return null;
                const isToday = pt.date === todayYMD();
                const r = isToday ? 5 : 4;
                return (
                  <View key={`d${i}`} style={{
                    position: 'absolute',
                    width: r * 2, height: r * 2, borderRadius: r,
                    backgroundColor: calorieColor(pt.v, goalKcal),
                    top: pt.y - r, left: pt.x - r,
                    borderWidth: isToday ? 1.5 : 0, borderColor: TEXT,
                  }} />
                );
              })}
            </View>
            <View style={{ height: X_AXIS_H, position: 'relative' }}>
              {days.map((d, i) => {
                if (i % 5 !== 0) return null;
                const dt = new Date(d + 'T00:00:00');
                const lbl = `${dt.toLocaleDateString('en-US', { month: 'short' })} ${dt.getDate()}`;
                return (
                  <Text key={d} style={{ position: 'absolute', left: i * W_SLOT, top: 3, fontSize: 8, color: MUTED, fontWeight: '600' }}>
                    {lbl}
                  </Text>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
      <View style={bc.legend}>
        {([
          [ACCENT_MID,  'Under goal'],
          [ACCENT,      'On track'],
          [ACCENT_DARK, 'Over goal'],
        ] as const).map(([c, l]) => (
          <View key={l} style={bc.legendItem}>
            <View style={[bc.dot, { backgroundColor: c }]} />
            <Text style={bc.legendTxt}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Weight line chart ─────────────────────────────────────────────────────────

const W_SLOT = 20;

function LineSeg({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1; const dy = y2 - y1;
  const len   = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View style={{
      position: 'absolute',
      width: len, height: 2,
      backgroundColor: ACCENT,
      borderRadius: 1,
      top:  (y1 + y2) / 2 - 1,
      left: (x1 + x2) / 2 - len / 2,
      transform: [{ rotate: `${angle}deg` }],
    }} />
  );
}

function WeightLineChart({ log, unit, onDayPress }: {
  log: WeightLog; unit: 'kg' | 'lbs'; onDayPress: (date: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: false }); }, []);

  const days    = getLast30Days();
  const rawKg   = days.map((d) => log[d] ?? null);
  const vals    = rawKg.map((v) => v === null ? null : (unit === 'lbs' ? +(v * 2.2046).toFixed(1) : +v.toFixed(1)));
  const nonNull = vals.filter((v): v is number => v !== null);

  if (nonNull.length === 0) {
    return (
      <TouchableOpacity style={wc.empty} onPress={() => onDayPress(todayYMD())} activeOpacity={0.7}>
        <Text style={wc.emptyTxt}>No weight logged yet</Text>
        <Text style={wc.emptySub}>Tap to log your first entry</Text>
      </TouchableOpacity>
    );
  }

  const lo  = Math.min(...nonNull) - 1;
  const hi  = Math.max(...nonNull) + 1;
  const rng = Math.max(hi - lo, 2);

  function toY(v: number) { return CHART_H - ((v - lo) / rng) * CHART_H; }

  const pts = days.map((d, i) => {
    const v = vals[i];
    return v === null ? null : { x: i * W_SLOT + W_SLOT / 2, y: toY(v), v, date: d };
  });

  const step   = niceStep(rng, 4);
  const first  = Math.ceil(lo / step) * step;
  const wTicks = Array.from({ length: Math.ceil((hi - first) / step) + 1 }, (_, i) => first + i * step)
    .filter((t) => t >= lo && t <= hi);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ width: Y_W }}>
        <View style={{ height: CHART_H, position: 'relative' }}>
          {wTicks.map((t) => (
            <Text key={t} style={[bc.yLabel, { bottom: Math.max(0, Math.round(((t - lo) / rng) * CHART_H) - 7) }]}>
              {unit === 'lbs' ? Math.round(t) : t.toFixed(1)}
            </Text>
          ))}
        </View>
        <View style={{ height: X_AXIS_H }} />
      </View>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ width: days.length * W_SLOT }}>
          <View style={{ height: CHART_H, position: 'relative' }}>
            {pts.map((pt, i) => {
              if (!pt) return null;
              const next = pts.slice(i + 1).find((p) => p !== null);
              if (!next) return null;
              return <LineSeg key={`l${i}`} x1={pt.x} y1={pt.y} x2={next.x} y2={next.y} />;
            })}
            {pts.map((pt, i) => {
              if (!pt) return null;
              const isToday = pt.date === todayYMD();
              const r = isToday ? 5 : 4;
              return (
                <View key={`d${i}`} style={{
                  position: 'absolute',
                  width: r * 2, height: r * 2, borderRadius: r,
                  backgroundColor: isToday ? ACCENT : ACCENT_MID,
                  top: pt.y - r, left: pt.x - r,
                  borderWidth: isToday ? 1.5 : 0, borderColor: TEXT,
                }} />
              );
            })}
            {days.map((day, i) => (
              <TouchableOpacity
                key={`tap${i}`}
                style={{ position: 'absolute', left: i * W_SLOT, width: W_SLOT, height: CHART_H }}
                onPress={() => onDayPress(day)}
                activeOpacity={0.4}
              />
            ))}
          </View>
          <View style={{ height: X_AXIS_H, position: 'relative' }}>
            {days.map((d, i) => {
              if (i % 5 !== 0) return null;
              const dt = new Date(d + 'T00:00:00');
              const lbl = `${dt.toLocaleDateString('en-US', { month: 'short' })} ${dt.getDate()}`;
              return (
                <Text key={d} style={{ position: 'absolute', left: i * W_SLOT, top: 3, fontSize: 8, color: MUTED, fontWeight: '600' }}>
                  {lbl}
                </Text>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Weight modal ──────────────────────────────────────────────────────────────

function WeightModal({ initialDate, weightLog, unit, onSave, onClose }: {
  initialDate: string; weightLog: WeightLog; unit: 'kg' | 'lbs';
  onSave: (date: string, kg: number) => void;
  onClose: () => void;
}) {
  const days = getLast30Days();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const toDisplay = (kg: number) => unit === 'lbs' ? (kg * 2.2046).toFixed(1) : kg.toFixed(1);
  const [input, setInput] = useState(() => {
    const kg = weightLog[initialDate];
    return kg ? toDisplay(kg) : '';
  });

  function selectDate(date: string) {
    setSelectedDate(date);
    const kg = weightLog[date];
    setInput(kg ? toDisplay(kg) : '');
  }

  function save() {
    const val = parseFloat(input);
    if (!val || val <= 0) return;
    const kg = unit === 'kg' ? val : val / 2.2046;
    onSave(selectedDate, Math.round(kg * 100) / 100);
    onClose();
  }

  const dateLabel = selectedDate === todayYMD()
    ? 'Today'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Modal visible animationType="slide" transparent>
      <View style={wm.overlay}>
        <View style={wm.sheet}>
          <View style={wm.header}>
            <Text style={wm.title}>Log Weight</Text>
            <TouchableOpacity onPress={onClose}><Text style={wm.close}>×</Text></TouchableOpacity>
          </View>

          {/* Date strip — last 30 days, scrollable */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 5, paddingHorizontal: 2 }}
          >
            {days.map((day) => {
              const d   = new Date(day + 'T00:00:00');
              const on  = day === selectedDate;
              const has = !!weightLog[day];
              return (
                <TouchableOpacity key={day} style={[wm.dayBtn, on && wm.dayBtnOn]} onPress={() => selectDate(day)}>
                  <Text style={[wm.dayLabel, on && wm.dayLabelOn]}>
                    {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase()}
                  </Text>
                  <Text style={[wm.dayNum, on && wm.dayNumOn]}>{d.getDate()}</Text>
                  <View style={[wm.dayDot, { opacity: has ? 1 : 0 }]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={wm.selectedLabel}>{dateLabel}</Text>

          <View style={wm.inputRow}>
            <TextInput
              style={wm.input}
              value={input}
              onChangeText={setInput}
              keyboardType="decimal-pad"
              placeholder={unit === 'kg' ? '70.0' : '154.3'}
              placeholderTextColor={DIM}
              selectTextOnFocus
            />
            <Text style={wm.unitLabel}>{unit}</Text>
          </View>

          <TouchableOpacity
            style={[wm.saveBtn, !input && wm.saveBtnOff]}
            onPress={save}
            disabled={!input}
          >
            <Text style={[wm.saveTxt, !input && wm.saveTxtOff]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const wm = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: CARD2, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12, paddingBottom: 36 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:         { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  close:         { color: MUTED, fontSize: 22, padding: 4 },

  dayBtn:        { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 7, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, minWidth: 42 },
  dayBtnOn:      { backgroundColor: ACCENT, borderColor: ACCENT },
  dayLabel:      { fontSize: 9, fontWeight: '700', color: DIM, letterSpacing: 0.4 },
  dayLabelOn:    { color: BG },
  dayNum:        { fontSize: 14, fontWeight: '900', color: MUTED, fontFamily: SERIF, marginTop: 1 },
  dayNumOn:      { color: BG },
  dayDot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT_SOFT, marginTop: 3 },

  selectedLabel: { fontSize: 12, color: MUTED, fontWeight: '600', textAlign: 'center' },

  inputRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input:         { flex: 1, backgroundColor: CARD, color: TEXT, fontSize: 28, fontWeight: '900', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, textAlign: 'center', borderWidth: 1, borderColor: BORDER, fontFamily: SERIF },
  unitLabel:     { fontSize: 18, fontWeight: '700', color: MUTED, width: 32 },
  saveBtn:       { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnOff:    { backgroundColor: CARD },
  saveTxt:       { color: BG, fontWeight: '800', fontSize: 15 },
  saveTxtOff:    { color: MUTED },
});

// ── Weight section ────────────────────────────────────────────────────────────

const wc = StyleSheet.create({
  card:     { backgroundColor: CARD, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: BORDER },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title:    { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  unitRow:  { flexDirection: 'row', gap: 4 },
  unitBtn:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: CARD2, borderWidth: 1, borderColor: BORDER },
  unitBtnOn:{ backgroundColor: ACCENT, borderColor: ACCENT },
  unitTxt:  { fontSize: 11, fontWeight: '700', color: MUTED },
  unitTxtOn:{ color: BG },
  latest:   { fontSize: 36, fontWeight: '900', color: ACCENT, fontFamily: SERIF, letterSpacing: -1 },
  latestUnit:{ fontSize: 16, fontWeight: '600', color: MUTED },
  logBtn:   { borderWidth: 1.5, borderColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  logBtnTxt:{ color: ACCENT, fontWeight: '700', fontSize: 14 },
  empty:    { height: CHART_H, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTxt: { fontSize: 14, fontWeight: '600', color: MUTED },
  emptySub: { fontSize: 11, color: DIM },
});

// ── Edit modals for calorie history ──────────────────────────────────────────

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
        <TouchableOpacity onPress={onClose}><Text style={ee.close}>×</Text></TouchableOpacity>
      </View>
      <TextInput style={ee.nameInput} value={name} onChangeText={setName} placeholderTextColor={DIM} />
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
  title:      { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  close:      { color: MUTED, fontSize: 20, padding: 4 },
  nameInput:  { backgroundColor: CARD, color: TEXT, fontSize: 14, fontWeight: '600', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: BORDER },
  macroRow:   { flexDirection: 'row', gap: 8 },
  field:      { flex: 1, alignItems: 'center', gap: 3 },
  fieldLabel: { fontSize: 9, color: MUTED, fontWeight: '700', textTransform: 'uppercase' },
  fieldInput: { backgroundColor: CARD, color: TEXT, fontSize: 14, fontWeight: '700', borderRadius: 7, paddingVertical: 8, width: '100%', textAlign: 'center', borderWidth: 1, borderColor: BORDER },
  fieldUnit:  { fontSize: 9, color: DIM },
  saveBtn:    { backgroundColor: ACCENT, borderRadius: 9, paddingVertical: 14, alignItems: 'center' },
  saveTxt:    { color: BG, fontWeight: '700', fontSize: 15 },
});

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
    onAdd({ id: generateId(), date, timestamp: new Date().toISOString(), name: name.trim(), calories, protein: parseInt(pro)||0, carbs: parseInt(carb)||0, fat: parseInt(fat)||0 });
    onClose();
  }

  return (
    <View style={af.wrap}>
      <View style={af.header}>
        <Text style={af.title}>Add Entry</Text>
        <TouchableOpacity onPress={onClose}><Text style={af.close}>×</Text></TouchableOpacity>
      </View>
      <TextInput style={af.nameInput} value={name} onChangeText={setName} placeholder="Food name" placeholderTextColor={DIM} autoFocus />
      <View style={af.row}>
        {([['Kcal',cal,setCal,true],['Protein',pro,setPro,false],['Carbs',carb,setCarb,false],['Fat',fat,setFat,false]] as [string,string,(v:string)=>void,boolean][]).map(([l,v,sv,req]) => (
          <View key={l} style={af.field}>
            <Text style={[af.fieldLbl, req && { color: ACCENT }]}>{l}</Text>
            <TextInput style={af.fieldInput} value={v} onChangeText={sv} keyboardType="numeric" selectTextOnFocus placeholder="0" placeholderTextColor={DIM} />
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
  title:     { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  close:     { color: MUTED, fontSize: 20, padding: 4 },
  nameInput: { backgroundColor: CARD, color: TEXT, fontSize: 14, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: BORDER },
  row:       { flexDirection: 'row', gap: 6 },
  field:     { flex: 1, alignItems: 'center', gap: 3 },
  fieldLbl:  { fontSize: 9, color: MUTED, fontWeight: '700', textTransform: 'uppercase' },
  fieldInput:{ backgroundColor: CARD, color: TEXT, fontSize: 13, fontWeight: '700', borderRadius: 6, paddingVertical: 8, width: '100%', textAlign: 'center', borderWidth: 1, borderColor: BORDER },
  btn:       { backgroundColor: ACCENT, borderRadius: 9, paddingVertical: 12, alignItems: 'center' },
  btnOff:    { backgroundColor: CARD },
  btnTxt:    { color: BG, fontWeight: '700', fontSize: 14 },
});

// ── Day choice modal ─────────────────────────────────────────────────────────

function DayChoiceModal({ date, onCalories, onWeight, onClose }: {
  date:       string;
  onCalories: () => void;
  onWeight:   () => void;
  onClose:    () => void;
}) {
  const label = date === todayYMD()
    ? 'Today'
    : new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      });

  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={dc.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={dc.sheet} onPress={() => {}}>
          <Text style={dc.dateLabel}>{label}</Text>

          <TouchableOpacity style={dc.option} onPress={onCalories} activeOpacity={0.75}>
            <View style={dc.iconBadge}><Text style={dc.iconTxt}>C</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={dc.optionTitle}>Calories</Text>
              <Text style={dc.optionSub}>View and edit meals for this day</Text>
            </View>
            <Text style={dc.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={dc.option} onPress={onWeight} activeOpacity={0.75}>
            <View style={dc.iconBadge}><Text style={dc.iconTxt}>W</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={dc.optionTitle}>Weight</Text>
              <Text style={dc.optionSub}>Log or update your weight for this day</Text>
            </View>
            <Text style={dc.arrow}>›</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
const dc = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  sheet:      { backgroundColor: CARD2, borderRadius: 20, padding: 20, gap: 12, width: '100%' },
  dateLabel:  { fontSize: 13, fontWeight: '700', color: MUTED, textAlign: 'center' },
  option:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 16, gap: 14, borderWidth: 1, borderColor: BORDER },
  iconBadge:  { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  iconTxt:    { fontSize: 15, fontWeight: '900', color: ACCENT, fontFamily: SERIF },
  optionTitle:{ fontSize: 15, fontWeight: '700', color: TEXT },
  optionSub:  { fontSize: 11, color: MUTED, marginTop: 2 },
  arrow:      { fontSize: 22, color: MUTED },
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
  const todayStr   = toYMD(todayDate);
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
          <Text style={[cal.navTxt, isCurrentMonth && { color: BORDER }]}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={cal.dayLabels}>
        {['S','M','T','W','T','F','S'].map((d, i) => <Text key={i} style={cal.dayLabel}>{d}</Text>)}
      </View>
      <View style={cal.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={cal.cell} />;
          const log     = history[date];
          const hasData = log && log.entries.length > 0;
          const color   = hasData ? calorieColor(dayTotals(log).calories, goals.calories) : null;
          const isToday = date === todayStr;
          const isFuture = date > todayStr;
          return (
            <TouchableOpacity key={date} style={[cal.cell, isToday && cal.cellToday]} onPress={() => onDayPress(date)} disabled={isFuture}>
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
  wrap:          { backgroundColor: CARD, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: BORDER },
  nav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:        { padding: 8 },
  navBtnOff:     { opacity: 0.25 },
  navTxt:        { fontSize: 24, color: TEXT, fontWeight: '700' },
  monthTxt:      { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  dayLabels:     { flexDirection: 'row' },
  dayLabel:      { flex: 1, textAlign: 'center', fontSize: 10, color: MUTED, fontWeight: '600' },
  grid:          { flexDirection: 'row', flexWrap: 'wrap' },
  cell:          { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellToday:     { backgroundColor: CARD2, borderRadius: 7 },
  cellTxt:       { fontSize: 13, color: MUTED },
  cellTxtToday:  { color: TEXT, fontWeight: '700' },
  cellTxtFuture: { color: BORDER },
  cellDot:       { width: 5, height: 5, borderRadius: 3 },
});

// ── Day modal ─────────────────────────────────────────────────────────────────

function DayModal({ date, history, goals, addEntry, updateEntry, removeHistoryEntry, onClose }: {
  date: string; history: any; goals: any;
  addEntry: (e: MacroEntry) => void;
  updateEntry: (d: string, id: string, u: any) => void;
  removeHistoryEntry: (d: string, id: string) => void;
  onClose: () => void;
}) {
  type View = 'list' | 'edit' | 'add';
  const [view, setView]            = useState<View>('list');
  const [editingEntry, setEditing] = useState<MacroEntry | null>(null);

  const log      = history[date] as { date: string; entries: MacroEntry[] } | undefined;
  const totals   = dayTotals(log);
  const color    = calorieColor(totals.calories, goals.calories);
  const label    = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const daysBack = daysBetween(date, todayYMD());
  const canAdd   = daysBack >= 0 && daysBack <= MAX_DAYS_BACK;

  return (
    <Modal visible animationType="fade" transparent>
      <TouchableOpacity style={dm.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={dm.card} onPress={() => {}}>
          <View style={dm.header}>
            <View style={{ flex: 1 }}>
              <Text style={dm.date}>{label}</Text>
              <Text style={[dm.kcal, { color, fontFamily: SERIF }]}>{totals.calories.toLocaleString()} kcal</Text>
              <Text style={dm.macros}>P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g</Text>
            </View>
            <TouchableOpacity onPress={onClose}><Text style={dm.closeTxt}>×</Text></TouchableOpacity>
          </View>
          <View style={dm.divider} />
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {view === 'add' ? (
              <AddEntryForm date={date} onAdd={addEntry} onClose={() => setView('list')} />
            ) : view === 'edit' && editingEntry ? (
              <EditHistoryEntry entry={editingEntry} date={date} onSave={updateEntry} onClose={() => { setEditing(null); setView('list'); }} />
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
                      <TouchableOpacity onPress={() => { setEditing(entry); setView('edit'); }} style={dm.actionBtn}>
                        <Text style={dm.actionTxt}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeHistoryEntry(date, entry.id)} style={dm.actionBtn}>
                        <Text style={dm.actionTxt}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
                {canAdd && (
                  <TouchableOpacity style={dm.addBtn} onPress={() => setView('add')}>
                    <Text style={dm.addBtnTxt}>+ Add Entry</Text>
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
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:      { backgroundColor: BG, borderRadius: 16, padding: 20, width: '100%', gap: 12, borderWidth: 1, borderColor: BORDER },
  header:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  date:      { fontSize: 13, fontWeight: '600', color: MUTED },
  kcal:      { fontSize: 28, fontWeight: '900', marginTop: 4 },
  macros:    { fontSize: 12, color: MUTED, marginTop: 2 },
  closeTxt:  { color: MUTED, fontSize: 22, padding: 4 },
  divider:   { height: 1, backgroundColor: BORDER },
  empty:     { fontSize: 14, color: MUTED, textAlign: 'center', paddingVertical: 24 },
  addBtn:    { marginTop: 12, backgroundColor: CARD, borderRadius: 9, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  addBtnTxt: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 8 },
  rowInfo:   { flex: 1 },
  rowName:   { fontSize: 14, fontWeight: '600', color: TEXT },
  rowMacros: { fontSize: 11, color: MUTED, marginTop: 2 },
  rowKcal:   { fontSize: 13, fontWeight: '800', color: ACCENT },
  actionBtn: { padding: 6 },
  actionTxt: { color: MUTED, fontSize: 13, fontWeight: '600' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CalorieProgressScreen() {
  const { history, goals, loaded, addEntry, updateEntry, removeHistoryEntry } = useCalorieStore();

  const [choiceDate,  setChoiceDate]  = useState<string | null>(null);
  const [calorieDate, setCalorieDate] = useState<string | null>(null);
  const [weightLog,   setWeightLog]   = useState<WeightLog>({});
  const [weightUnit,  setWeightUnit]  = useState<'kg' | 'lbs'>('kg');
  const [weightModal, setWeightModal] = useState<string | null>(null); // date string or null

  useEffect(() => {
    AsyncStorage.getItem(WEIGHT_KEY).then((raw) => {
      if (raw) setWeightLog(JSON.parse(raw));
    });
  }, []);

  function saveWeight(date: string, kg: number) {
    const updated = { ...weightLog, [date]: kg };
    setWeightLog(updated);
    AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(updated));
  }

  if (!loaded) return <View style={s.loading}><Text style={s.loadingTxt}>Loading…</Text></View>;

  const days30   = getLast30Days();
  const logged30 = days30.filter((d) => (history[d]?.entries?.length ?? 0) > 0).length;
  const avgKcal  = logged30 > 0
    ? Math.round(days30.reduce((sum, d) => sum + dayTotals(history[d]).calories, 0) / logged30)
    : 0;

  // Latest weight (most recent entry)
  const latestWeightKg = days30.slice().reverse().map((d) => weightLog[d]).find((v) => v != null) ?? null;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Summary chips ── */}
        <View style={s.statsRow}>
          <View style={s.chip}>
            <Text style={[s.chipNum, { fontFamily: SERIF }]}>{logged30}</Text>
            <Text style={s.chipLbl}>days logged</Text>
          </View>
          <View style={s.chip}>
            <Text style={[s.chipNum, { fontFamily: SERIF }]}>{avgKcal || '—'}</Text>
            <Text style={s.chipLbl}>avg kcal / day</Text>
          </View>
          <View style={s.chip}>
            <Text style={[s.chipNum, { fontFamily: SERIF }]}>{goals.calories.toLocaleString()}</Text>
            <Text style={s.chipLbl}>daily goal</Text>
          </View>
        </View>

        {/* ── Calorie line chart ── */}
        <CalorieLineChart history={history} goals={goals} />

        {/* ── Weight tracker ── */}
        <View style={wc.card}>
          <View style={wc.header}>
            <Text style={wc.title}>Weight Progress</Text>
            <View style={wc.unitRow}>
              {(['kg', 'lbs'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[wc.unitBtn, weightUnit === u && wc.unitBtnOn]}
                  onPress={() => setWeightUnit(u)}
                >
                  <Text style={[wc.unitTxt, weightUnit === u && wc.unitTxtOn]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {latestWeightKg !== null && (
            <Text style={wc.latest}>
              {weightUnit === 'lbs'
                ? (latestWeightKg * 2.2046).toFixed(1)
                : latestWeightKg.toFixed(1)}
              <Text style={wc.latestUnit}> {weightUnit}</Text>
            </Text>
          )}

          <WeightLineChart log={weightLog} unit={weightUnit} onDayPress={(d) => setWeightModal(d)} />

          <TouchableOpacity style={wc.logBtn} onPress={() => setWeightModal(todayYMD())}>
            <Text style={wc.logBtnTxt}>+ Log Weight</Text>
          </TouchableOpacity>
        </View>

        {/* ── Calendar ── */}
        <CalendarView history={history} goals={goals} onDayPress={(d) => setChoiceDate(d)} />

        <Text style={s.tapHint}>Tap any coloured day to view and edit logged meals.</Text>

      </ScrollView>

      {/* ── Modals ── */}
      {choiceDate && (
        <DayChoiceModal
          date={choiceDate}
          onCalories={() => { setCalorieDate(choiceDate); setChoiceDate(null); }}
          onWeight={() => { setWeightModal(choiceDate); setChoiceDate(null); }}
          onClose={() => setChoiceDate(null)}
        />
      )}

      {calorieDate && (
        <DayModal
          date={calorieDate}
          history={history}
          goals={goals}
          addEntry={addEntry}
          updateEntry={updateEntry}
          removeHistoryEntry={removeHistoryEntry}
          onClose={() => setCalorieDate(null)}
        />
      )}

      {weightModal && (
        <WeightModal
          initialDate={weightModal}
          weightLog={weightLog}
          unit={weightUnit}
          onSave={saveWeight}
          onClose={() => setWeightModal(null)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: BG },
  loading:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadingTxt: { color: MUTED, fontSize: 15 },
  scroll:     { padding: 16, gap: 14, paddingBottom: 32 },
  statsRow:   { flexDirection: 'row', gap: 8 },
  chip:       { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: BORDER },
  chipNum:    { fontSize: 22, fontWeight: '900', color: ACCENT },
  chipLbl:    { fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 },
  tapHint:    { fontSize: 11, color: DIM, textAlign: 'center' },
});
