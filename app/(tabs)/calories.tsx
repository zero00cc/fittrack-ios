import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  StyleSheet, Alert, Modal, TextInput, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCalorieStore } from '../../hooks/useCalorieStore';
import { MacroEntry } from '../../types/calorie.types';
import { dayTotals, calorieColor, generateId } from '../../utils/calorieUtils';
import { todayYMD, addDays } from '../../utils/dateUtils';
import { DonutRing } from '../../components/calorie/DonutRing';
import { USER_PROFILE_KEY, UserProfile } from '../../utils/nutritionCalc';
import { generateReport, ReportType } from '../../utils/generateReport';
import {
  BG, CARD, CARD2, BORDER, TEXT, MUTED, DIM,
  ACCENT, ACCENT_SOFT, ACCENT_MID, ACCENT_DARK, SERIF,
} from '../../constants/theme';

const MAX_DAYS_BACK = 7;
const WEIGHT_KEY    = 'fittrack_weight_log';
const C_PROTEIN = DIM;
const C_CARBS   = ACCENT;
const C_FAT     = ACCENT_DARK;

export const pendingImage = { uri: '', mimeType: 'image/jpeg', date: '' };

// ── Week strip ────────────────────────────────────────────────────────────────

function WeekStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = todayYMD();
  const days  = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <View style={ws.row}>
      {days.map((day) => {
        const d  = new Date(day + 'T00:00:00');
        const on = day === selected;
        return (
          <TouchableOpacity key={day} style={[ws.btn, on && ws.btnOn]} onPress={() => onSelect(day)}>
            <Text style={[ws.day, on && ws.dayOn]}>
              {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase()}
            </Text>
            <Text style={[ws.num, on && ws.numOn]}>{d.getDate()}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const ws = StyleSheet.create({
  row:   { flexDirection: 'row', gap: 5 },
  btn:   { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  btnOn: { backgroundColor: TEXT, borderColor: TEXT },
  day:   { fontSize: 9, fontWeight: '700', color: DIM, letterSpacing: 0.4 },
  dayOn: { color: CARD },
  num:   { fontSize: 15, fontWeight: '900', color: TEXT, marginTop: 2, fontFamily: SERIF },
  numOn: { color: BG },
});

// ── Add manually modal ────────────────────────────────────────────────────────

function AddManualModal({ date, onAdd, onClose }: {
  date:    string;
  onAdd:   (entry: MacroEntry) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [cal,  setCal]  = useState('');
  const [pro,  setPro]  = useState('0');
  const [carb, setCarb] = useState('0');
  const [fat,  setFat]  = useState('0');

  function add() {
    const calories = parseInt(cal);
    if (!name.trim() || !calories) return;
    onAdd({
      id:        generateId(),
      date,
      timestamp: new Date().toISOString(),
      name:      name.trim(),
      calories,
      protein:   parseInt(pro)  || 0,
      carbs:     parseInt(carb) || 0,
      fat:       parseInt(fat)  || 0,
    });
    onClose();
  }

  return (
    <Modal visible animationType="slide" transparent>
      <View style={am.overlay}>
        <View style={am.sheet}>
          <View style={am.header}>
            <Text style={am.title}>Add Manually</Text>
            <TouchableOpacity onPress={onClose}><Text style={am.close}>×</Text></TouchableOpacity>
          </View>
          <TextInput style={am.nameInput} value={name} onChangeText={setName} placeholder="Food name" placeholderTextColor={DIM} autoFocus />
          <View style={am.macroRow}>
            {([
              ['Calories', 'kcal', cal,  setCal,  true],
              ['Protein',  'g',    pro,  setPro,  false],
              ['Carbs',    'g',    carb, setCarb, false],
              ['Fat',      'g',    fat,  setFat,  false],
            ] as [string, string, string, (v: string) => void, boolean][]).map(([lbl, unit, val, set, req]) => (
              <View key={lbl} style={am.macroField}>
                <Text style={[am.macroLabel, req && { color: ACCENT }]}>{lbl}{req ? ' *' : ''}</Text>
                <TextInput style={am.macroInput} value={val} onChangeText={set} keyboardType="numeric" selectTextOnFocus placeholder="0" placeholderTextColor={DIM} />
                <Text style={am.macroUnit}>{unit}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[am.addBtn, (!name.trim() || !cal) && am.addBtnOff]} onPress={add} disabled={!name.trim() || !cal}>
            <Text style={am.addTxt}>Add to Log</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const am = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: BG, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 14, paddingBottom: 36, borderTopWidth: 1, borderColor: BORDER },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 17, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  close:      { color: MUTED, fontSize: 22, padding: 4 },
  nameInput:  { backgroundColor: CARD, color: TEXT, fontSize: 15, fontWeight: '600', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: BORDER },
  macroRow:   { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1, alignItems: 'center', gap: 4 },
  macroLabel: { fontSize: 9, color: MUTED, fontWeight: '700', textTransform: 'uppercase' },
  macroInput: { backgroundColor: CARD, color: TEXT, fontSize: 15, fontWeight: '700', borderRadius: 7, paddingVertical: 8, width: '100%', textAlign: 'center', borderWidth: 1, borderColor: BORDER },
  macroUnit:  { fontSize: 9, color: DIM },
  addBtn:     { backgroundColor: TEXT, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  addBtnOff:  { backgroundColor: CARD },
  addTxt:     { color: BG, fontWeight: '800', fontSize: 15 },
});

// ── Log weight modal ──────────────────────────────────────────────────────────

function LogWeightModal({ date, weightLog, unit, onSave, onClose }: {
  date:      string;
  weightLog: Record<string, number>;
  unit:      'kg' | 'lbs';
  onSave:    (kg: number) => void;
  onClose:   () => void;
}) {
  const toDisplay = (kg: number) => unit === 'lbs' ? (kg * 2.2046).toFixed(1) : kg.toFixed(1);
  const [input, setInput] = useState(() => {
    const kg = weightLog[date];
    return kg ? toDisplay(kg) : '';
  });

  const dateLabel = date === todayYMD()
    ? 'Today'
    : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  function save() {
    const val = parseFloat(input);
    if (!val || val <= 0) return;
    const kg = unit === 'kg' ? val : val / 2.2046;
    onSave(Math.round(kg * 100) / 100);
    onClose();
  }

  return (
    <Modal visible animationType="slide" transparent>
      <View style={lw.overlay}>
        <View style={lw.sheet}>
          <View style={lw.header}>
            <Text style={lw.title}>Log Weight</Text>
            <TouchableOpacity onPress={onClose}><Text style={lw.close}>×</Text></TouchableOpacity>
          </View>
          <Text style={lw.dateLabel}>{dateLabel}</Text>
          <View style={lw.inputRow}>
            <TextInput
              style={lw.input}
              value={input}
              onChangeText={setInput}
              keyboardType="decimal-pad"
              placeholder={unit === 'kg' ? '70.0' : '154.3'}
              placeholderTextColor={DIM}
              autoFocus
              selectTextOnFocus
            />
            <Text style={lw.unitLabel}>{unit}</Text>
          </View>
          <TouchableOpacity
            style={[lw.saveBtn, !input && lw.saveBtnOff]}
            onPress={save}
            disabled={!input}
          >
            <Text style={[lw.saveTxt, !input && lw.saveTxtOff]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const lw = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: CARD2, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 14, paddingBottom: 36, borderTopWidth: 1, borderColor: BORDER },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 17, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  close:      { color: MUTED, fontSize: 22, padding: 4 },
  dateLabel:  { fontSize: 12, color: MUTED, fontWeight: '600', textAlign: 'center' },
  inputRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input:      { flex: 1, backgroundColor: CARD, color: TEXT, fontSize: 28, fontWeight: '900', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, textAlign: 'center', borderWidth: 1, borderColor: BORDER, fontFamily: SERIF },
  unitLabel:  { fontSize: 18, fontWeight: '700', color: MUTED, width: 32 },
  saveBtn:    { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnOff: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: BORDER },
  saveTxt:    { color: BG, fontWeight: '800', fontSize: 15 },
  saveTxtOff: { color: DIM },
});

// ── Edit entry modal ──────────────────────────────────────────────────────────

function EditEntryModal({ entry, onSave, onDelete, onClose }: {
  entry:    MacroEntry;
  onSave:   (date: string, id: string, updates: any) => void;
  onDelete: (date: string, id: string) => void;
  onClose:  () => void;
}) {
  const [name, setName] = useState(entry.name);
  const [cal,  setCal]  = useState(String(entry.calories));
  const [pro,  setPro]  = useState(String(entry.protein));
  const [carb, setCarb] = useState(String(entry.carbs));
  const [fat,  setFat]  = useState(String(entry.fat));

  return (
    <Modal visible animationType="slide" transparent>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <Text style={em.title}>Edit Meal</Text>
            <TouchableOpacity onPress={onClose}><Text style={em.close}>×</Text></TouchableOpacity>
          </View>
          <TextInput style={em.nameInput} value={name} onChangeText={setName} placeholder="Food name" placeholderTextColor={DIM} />
          <View style={em.macroRow}>
            {([
              ['Calories', 'kcal', cal,  setCal],
              ['Protein',  'g',    pro,  setPro],
              ['Carbs',    'g',    carb, setCarb],
              ['Fat',      'g',    fat,  setFat],
            ] as [string, string, string, (v: string) => void][]).map(([lbl, unit, val, set]) => (
              <View key={lbl} style={em.macroField}>
                <Text style={em.macroLabel}>{lbl}</Text>
                <TextInput style={em.macroInput} value={val} onChangeText={set} keyboardType="numeric" selectTextOnFocus />
                <Text style={em.macroUnit}>{unit}</Text>
              </View>
            ))}
          </View>
          <View style={em.btns}>
            <TouchableOpacity style={em.deleteBtn} onPress={() => { onDelete(entry.date, entry.id); onClose(); }}>
              <Text style={em.deleteTxt}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={em.saveBtn} onPress={() => {
              onSave(entry.date, entry.id, {
                name,
                calories: parseInt(cal)  || entry.calories,
                protein:  parseInt(pro)  || entry.protein,
                carbs:    parseInt(carb) || entry.carbs,
                fat:      parseInt(fat)  || entry.fat,
              });
              onClose();
            }}>
              <Text style={em.saveTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const em = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: BG, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 14, paddingBottom: 36, borderTopWidth: 1, borderColor: BORDER },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 17, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  close:      { color: MUTED, fontSize: 22, padding: 4 },
  nameInput:  { backgroundColor: CARD, color: TEXT, fontSize: 15, fontWeight: '700', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: BORDER },
  macroRow:   { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1, alignItems: 'center', gap: 4 },
  macroLabel: { fontSize: 9, color: MUTED, fontWeight: '700', textTransform: 'uppercase' },
  macroInput: { backgroundColor: CARD, color: TEXT, fontSize: 15, fontWeight: '700', borderRadius: 7, paddingVertical: 8, width: '100%', textAlign: 'center', borderWidth: 1, borderColor: BORDER },
  macroUnit:  { fontSize: 9, color: DIM },
  btns:       { flexDirection: 'row', gap: 12 },
  deleteBtn:  { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  saveBtn:    { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: TEXT },
  deleteTxt:  { color: ACCENT_DARK, fontWeight: '700', fontSize: 15 },
  saveTxt:    { color: BG, fontWeight: '700', fontSize: 15 },
});

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({ entry, onEdit, onDelete }: {
  entry: MacroEntry; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={ec.card} onPress={onEdit} activeOpacity={0.75}>
      {entry.imageUri
        ? <Image source={{ uri: entry.imageUri }} style={ec.thumb} />
        : (
          <View style={ec.placeholder}>
            <Text style={ec.placeholderTxt}>{entry.name.charAt(0).toUpperCase()}</Text>
          </View>
        )
      }
      <View style={ec.info}>
        <Text style={ec.name} numberOfLines={1}>{entry.name}</Text>
        <Text style={ec.macros}>P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g</Text>
      </View>
      <View style={ec.right}>
        <Text style={[ec.kcal, { fontFamily: SERIF }]}>{entry.calories}</Text>
        <Text style={ec.kcalUnit}>kcal</Text>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
        <Text style={ec.del}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
const ec = StyleSheet.create({
  card:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  thumb:          { width: 48, height: 48, borderRadius: 8, resizeMode: 'cover' },
  placeholder:    { width: 48, height: 48, borderRadius: 8, backgroundColor: CARD2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  placeholderTxt: { fontSize: 18, fontWeight: '900', color: MUTED, fontFamily: SERIF },
  info:           { flex: 1 },
  name:           { fontSize: 14, fontWeight: '700', color: TEXT },
  macros:         { fontSize: 11, color: MUTED, marginTop: 3 },
  right:          { alignItems: 'flex-end', marginRight: 4 },
  kcal:           { fontSize: 16, fontWeight: '900', color: ACCENT },
  kcalUnit:       { fontSize: 9, color: DIM },
  del:            { fontSize: 16, color: DIM, padding: 4 },
});

// ── Report picker modal ───────────────────────────────────────────────────────

function ReportPickerModal({ onSelect, onClose }: {
  onSelect: (type: ReportType) => void;
  onClose:  () => void;
}) {
  return (
    <Modal visible animationType="fade" transparent>
      <View style={rp.overlay}>
        <View style={rp.card}>
          <Text style={rp.title}>AI Report</Text>
          <Text style={rp.subtitle}>Generate a personalised report from your calorie, macro, and weight data.</Text>
          <TouchableOpacity style={rp.option} onPress={() => onSelect('week')}>
            <Text style={rp.optionTitle}>7-Day Report</Text>
            <Text style={rp.optionDesc}>Short-term snapshot of this week's nutrition</Text>
          </TouchableOpacity>
          <TouchableOpacity style={rp.option} onPress={() => onSelect('month')}>
            <Text style={rp.optionTitle}>30-Day Report</Text>
            <Text style={rp.optionDesc}>Monthly overview with trends and progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={rp.cancel} onPress={onClose}>
            <Text style={rp.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const rp = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:        { backgroundColor: CARD2, borderRadius: 20, padding: 24, width: '100%', gap: 14, borderWidth: 1, borderColor: BORDER },
  title:       { fontSize: 20, fontWeight: '800', color: TEXT, fontFamily: SERIF, textAlign: 'center' },
  subtitle:    { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  option:      { backgroundColor: CARD, borderRadius: 13, padding: 16, gap: 4, borderWidth: 1, borderColor: BORDER },
  optionTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  optionDesc:  { fontSize: 12, color: MUTED },
  cancel:      { alignItems: 'center', paddingVertical: 14, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  cancelTxt:   { fontSize: 14, color: DIM, fontWeight: '600' },
});

// ── Report view modal ─────────────────────────────────────────────────────────

function renderReportLines(text: string) {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <View key={i} style={{ height: 6 }} />;
    const isHeader = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]{2}/.test(trimmed);
    const isBullet = trimmed.startsWith('- ');
    if (isHeader) return <Text key={i} style={rv.lineHeader}>{trimmed}</Text>;
    if (isBullet) return (
      <View key={i} style={rv.bulletRow}>
        <Text style={rv.bulletMark}>•</Text>
        <Text style={rv.bulletTxt}>{trimmed.slice(2)}</Text>
      </View>
    );
    return <Text key={i} style={rv.lineBody}>{trimmed}</Text>;
  });
}

function ReportViewModal({ text, loading, onClose }: {
  text:    string;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible animationType="fade" transparent>
      <View style={rv.overlay}>
        <View style={rv.card}>
          <View style={rv.header}>
            <Text style={rv.title}>AI Report</Text>
            <TouchableOpacity onPress={onClose}><Text style={rv.closeX}>×</Text></TouchableOpacity>
          </View>
          {loading ? (
            <View style={rv.loadingBox}>
              <ActivityIndicator color={ACCENT} size="large" />
              <Text style={rv.loadingTxt}>Analysing your data…</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={rv.content}>
              {renderReportLines(text)}
            </ScrollView>
          )}
          {!loading && (
            <TouchableOpacity style={rv.closeBtn} onPress={onClose}>
              <Text style={rv.closeBtnTxt}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
const rv = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card:        { backgroundColor: CARD, borderRadius: 20, padding: 20, width: '100%', maxHeight: '82%', gap: 14, borderWidth: 1, borderColor: BORDER },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:       { fontSize: 18, fontWeight: '800', color: TEXT, fontFamily: SERIF },
  closeX:      { fontSize: 24, color: MUTED, padding: 4 },
  loadingBox:  { alignItems: 'center', paddingVertical: 40, gap: 16 },
  loadingTxt:  { fontSize: 14, color: MUTED, fontWeight: '600' },
  content:     { gap: 2, paddingBottom: 8 },
  lineHeader:  { fontSize: 12, fontWeight: '800', color: ACCENT_DARK, letterSpacing: 0.9, marginTop: 12, marginBottom: 2 },
  lineBody:    { fontSize: 13, color: TEXT, lineHeight: 20 },
  bulletRow:   { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletMark:  { fontSize: 13, color: ACCENT, lineHeight: 20 },
  bulletTxt:   { fontSize: 13, color: TEXT, lineHeight: 20, flex: 1 },
  closeBtn:    { backgroundColor: TEXT, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  closeBtnTxt: { color: BG, fontWeight: '700', fontSize: 14 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CaloriesScreen() {
  const {
    history, goals, loaded,
    addEntry, removeHistoryEntry, updateEntry,
    reloadHistory, reloadGoals,
  } = useCalorieStore();

  const [selectedDate, setSelectedDate] = useState(todayYMD);
  const [editEntry,    setEditEntry]    = useState<MacroEntry | null>(null);
  const [addManual,    setAddManual]    = useState(false);
  const [fabOpen,      setFabOpen]      = useState(false);
  const [logWeight,    setLogWeight]    = useState(false);
  const [weightLog,    setWeightLog]    = useState<Record<string, number>>({});
  const [weightUnit,   setWeightUnit]   = useState<'kg' | 'lbs'>('kg');

  const [toast, setToast] = useState<string | null>(null);
  const toastAnim         = useRef(new Animated.Value(0)).current;
  const prevLogState      = useRef<{ date: string; count: number } | null>(null);

  const [showReportPicker, setShowReportPicker] = useState(false);
  const [reportText,       setReportText]       = useState('');
  const [reportLoading,    setReportLoading]    = useState(false);
  const [showReport,       setShowReport]       = useState(false);

  useFocusEffect(useCallback(() => {
    reloadHistory();
    reloadGoals();
    AsyncStorage.getItem(USER_PROFILE_KEY).then((raw) => {
      if (!(raw && JSON.parse(raw).onboardingComplete)) router.replace('/calorie-onboarding');
    });
  }, [reloadHistory, reloadGoals]));

  useEffect(() => {
    AsyncStorage.getItem(WEIGHT_KEY).then((raw) => {
      if (raw) setWeightLog(JSON.parse(raw));
    });
  }, []);

  const selectedLog = history[selectedDate] ?? { date: selectedDate, entries: [] };

  useEffect(() => {
    if (!loaded) return;
    const count = selectedLog.entries.length;
    const prev  = prevLogState.current;
    if (prev && prev.date === selectedDate && count > prev.count) {
      const newest = selectedLog.entries[selectedLog.entries.length - 1];
      showToast(`${newest.name} · +${newest.calories} kcal`);
    }
    prevLogState.current = { date: selectedDate, count };
  }, [selectedLog.entries.length, selectedDate, loaded]);

  function showToast(msg: string) {
    setToast(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, speed: 14 }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  function saveWeight(kg: number) {
    const updated = { ...weightLog, [selectedDate]: kg };
    setWeightLog(updated);
    AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(updated));
    showToast(`Weight logged for ${selectedDate === todayYMD() ? 'today' : selectedDate}`);
  }

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera access needed', 'Allow in Settings.'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      pendingImage.uri = a.uri; pendingImage.mimeType = a.mimeType ?? 'image/jpeg'; pendingImage.date = selectedDate;
      router.push('/calorie-result');
    }
  }

  async function openLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Photo access needed', 'Allow in Settings.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      pendingImage.uri = a.uri; pendingImage.mimeType = a.mimeType ?? 'image/jpeg'; pendingImage.date = selectedDate;
      router.push('/calorie-result');
    }
  }

  async function handleGenerateReport(type: ReportType) {
    setShowReportPicker(false);
    setShowReport(true);
    setReportLoading(true);
    setReportText('');
    try {
      const [profileRaw, weightRaw] = await Promise.all([
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(WEIGHT_KEY),
      ]);
      const profile   = profileRaw ? JSON.parse(profileRaw) as UserProfile : null;
      const weightLogData = weightRaw  ? JSON.parse(weightRaw) as Record<string, number> : {};
      if (!profile) throw new Error('Bio data not found. Please complete onboarding first.');
      const text = await generateReport(type, profile, goals, history, weightLogData);
      setReportText(text);
    } catch (err: any) {
      setReportText(`Could not generate report: ${err.message}`);
    } finally {
      setReportLoading(false);
    }
  }

  if (!loaded) return <View style={s.center}><Text style={s.loadTxt}>Loading…</Text></View>;

  const totals    = dayTotals(selectedLog);
  const mainColor = calorieColor(totals.calories, goals.calories);
  const isToday   = selectedDate === todayYMD();
  const remaining = goals.calories - totals.calories;

  const FAB_OPTIONS = [
    { icon: '📷', label: 'Scan Food',     sub: 'Take a photo to analyse',    onPress: () => { setFabOpen(false); openCamera();         } },
    { icon: '🖼️', label: 'Upload Photo',  sub: 'Choose from your library',   onPress: () => { setFabOpen(false); openLibrary();        } },
    { icon: '✏️', label: 'Add Manually',  sub: 'Enter nutrition details',     onPress: () => { setFabOpen(false); setAddManual(true);   } },
    { icon: '⚖️', label: 'Log Weight',    sub: 'Record your weight for today', onPress: () => { setFabOpen(false); setLogWeight(true);  } },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.appName}>Calorie Tracker</Text>
            <Text style={s.dateLabel}>
              {isToday ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => setShowReportPicker(true)} style={s.aiReportBtn}>
              <Text style={s.aiReportTxt}>AI Report</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/calorie-settings')} style={s.settingsBtn}>
              <Text style={s.settingsIcon}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Week strip ── */}
        <WeekStrip selected={selectedDate} onSelect={setSelectedDate} />

        {!isToday && (
          <TouchableOpacity onPress={() => setSelectedDate(todayYMD())} style={s.backToday}>
            <Text style={s.backTodayTxt}>← Today</Text>
          </TouchableOpacity>
        )}

        {/* ── Hero ── */}
        <View style={s.heroCard}>
          <View style={s.heroLeft}>
            <Text style={[s.calNumber, { color: mainColor, fontFamily: SERIF }]}>
              {totals.calories.toLocaleString()}
            </Text>
            <Text style={s.calGoal}>/ {goals.calories.toLocaleString()} kcal</Text>
            <Text style={[s.calStatus, { color: mainColor }]}>
              {remaining >= 0 ? `${remaining.toLocaleString()} remaining` : `${Math.abs(remaining).toLocaleString()} over goal`}
            </Text>
          </View>
          <DonutRing current={totals.calories} goal={goals.calories} color={mainColor} size={130} showCenter={false} />
        </View>

        {/* ── Macro rings ── */}
        <View style={s.macroRow}>
          <DonutRing current={totals.protein} goal={goals.protein} color={C_PROTEIN} size={112} label="Protein" />
          <DonutRing current={totals.carbs}   goal={goals.carbs}   color={C_CARBS}   size={112} label="Carbs"   />
          <DonutRing current={totals.fat}      goal={goals.fat}     color={C_FAT}     size={112} label="Fat"     />
        </View>

        {/* ── Log ── */}
        <View style={s.logCard}>
          <View style={s.logHeader}>
            <Text style={s.logTitle}>Recently Logged</Text>
            <TouchableOpacity onPress={() => router.push('/calorie-progress')}>
              <Text style={s.progressLink}>Progress →</Text>
            </TouchableOpacity>
          </View>

          {selectedLog.entries.length === 0 ? (
            <View style={s.empty}>
              <Text style={[s.emptyNum, { fontFamily: SERIF }]}>—</Text>
              <Text style={s.emptyTxt}>No meals logged{isToday ? ' yet' : ' for this day'}</Text>
              <Text style={s.emptySub}>Tap  +  to log a meal or weight</Text>
            </View>
          ) : (
            [...selectedLog.entries].reverse().map((entry) => (
              <EntryCard key={entry.id} entry={entry} onEdit={() => setEditEntry(entry)} onDelete={() => removeHistoryEntry(entry.date, entry.id)} />
            ))
          )}
        </View>

      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={s.fab} onPress={() => setFabOpen(true)} activeOpacity={0.85}>
        <Text style={s.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── Toast ── */}
      {toast && (
        <Animated.View style={[s.toast, {
          opacity:   toastAnim,
          transform: [{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        }]}>
          <Text style={s.toastIcon}>✓</Text>
          <Text style={s.toastTxt} numberOfLines={1}>{toast}</Text>
        </Animated.View>
      )}

      {/* ── FAB menu ── */}
      {fabOpen && (
        <Modal visible animationType="slide" transparent>
          <TouchableOpacity style={fm.overlay} activeOpacity={1} onPress={() => setFabOpen(false)}>
            <TouchableOpacity activeOpacity={1} style={fm.sheet} onPress={() => {}}>
              <View style={fm.handle} />
              <Text style={fm.sheetTitle}>Add to Log</Text>
              {FAB_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.label} style={fm.option} onPress={opt.onPress} activeOpacity={0.75}>
                  <View style={fm.iconBadge}><Text style={fm.optionIcon}>{opt.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={fm.optionLabel}>{opt.label}</Text>
                    <Text style={fm.optionSub}>{opt.sub}</Text>
                  </View>
                  <Text style={fm.arrow}>›</Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {addManual    && <AddManualModal   date={selectedDate} onAdd={addEntry} onClose={() => setAddManual(false)} />}
      {logWeight    && <LogWeightModal   date={selectedDate} weightLog={weightLog} unit={weightUnit} onSave={saveWeight} onClose={() => setLogWeight(false)} />}
      {editEntry    && <EditEntryModal   entry={editEntry} onSave={updateEntry} onDelete={removeHistoryEntry} onClose={() => setEditEntry(null)} />}
      {showReportPicker && <ReportPickerModal onSelect={handleGenerateReport} onClose={() => setShowReportPicker(false)} />}
      {showReport       && <ReportViewModal   text={reportText} loading={reportLoading} onClose={() => setShowReport(false)} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: BG },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loadTxt:      { color: MUTED, fontSize: 15 },
  scroll:       { padding: 16, gap: 14, paddingBottom: 100 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName:      { fontSize: 26, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  dateLabel:    { fontSize: 13, color: MUTED, marginTop: 2 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiReportBtn:  { backgroundColor: CARD, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: BORDER },
  aiReportTxt:  { fontSize: 12, fontWeight: '700', color: ACCENT },
  settingsBtn:  { backgroundColor: CARD, borderRadius: 9, padding: 10, borderWidth: 1, borderColor: BORDER },
  settingsIcon: { fontSize: 18, color: MUTED },

  backToday:    { alignSelf: 'center' },
  backTodayTxt: { color: ACCENT, fontSize: 13, fontWeight: '600' },

  heroCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: BORDER, gap: 8 },
  heroLeft:     { flex: 1, gap: 4 },
  calNumber:    { fontSize: 58, fontWeight: '900', letterSpacing: -1.5, lineHeight: 64 },
  calGoal:      { fontSize: 14, color: MUTED, fontWeight: '600' },
  calStatus:    { fontSize: 13, fontWeight: '700' },

  macroRow:     { flexDirection: 'row', justifyContent: 'space-between' },

  logCard:      { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  logHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logTitle:     { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  progressLink: { fontSize: 12, color: ACCENT, fontWeight: '600' },

  empty:        { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyNum:     { fontSize: 48, fontWeight: '900', color: BORDER },
  emptyTxt:     { fontSize: 14, color: MUTED, fontWeight: '600' },
  emptySub:     { fontSize: 11, color: DIM, textAlign: 'center' },

  fab:          { position: 'absolute', bottom: 24, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  fabIcon:      { fontSize: 30, color: BG, fontWeight: '300', lineHeight: 34, marginTop: -2 },

  toast:        { position: 'absolute', bottom: 92, left: 16, right: 16, backgroundColor: TEXT, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toastIcon:    { fontSize: 16, color: ACCENT_SOFT },
  toastTxt:     { fontSize: 14, fontWeight: '700', color: CARD, flex: 1 },
});

const fm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: CARD2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, paddingBottom: 40, borderTopWidth: 1, borderColor: BORDER },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 6 },
  sheetTitle:  { fontSize: 13, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', marginBottom: 4 },
  option:      { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 16, gap: 14, borderWidth: 1, borderColor: BORDER },
  iconBadge:   { width: 44, height: 44, borderRadius: 22, backgroundColor: CARD2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  optionIcon:  { fontSize: 20 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: TEXT },
  optionSub:   { fontSize: 11, color: MUTED, marginTop: 2 },
  arrow:       { fontSize: 22, color: MUTED },
});
