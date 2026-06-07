import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  StyleSheet, Alert, Modal, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCalorieStore } from '../../hooks/useCalorieStore';
import { CalorieGoals, MacroEntry } from '../../types/calorie.types';
import { dayTotals, calorieColor, generateId } from '../../utils/calorieUtils';
import { todayYMD } from '../../utils/dateUtils';
import { DonutRing } from '../../components/calorie/DonutRing';
import { USER_PROFILE_KEY } from '../../utils/nutritionCalc';

// Shared mutable for passing image URI to the result screen (module-level is fine — single JS thread)
export const pendingImage = { uri: '', mimeType: 'image/jpeg' };

// ── Animated progress bar ─────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct  = max > 0 ? Math.min(1, value / max) : 0;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { flex: anim, backgroundColor: color }]} />
      <View style={[pb.bg, { flex: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) as any }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#1e293b' },
  fill:  { borderRadius: 4 },
  bg:    { backgroundColor: '#1e293b' },
});

// ── Macro chip ────────────────────────────────────────────────────────────────

function MacroChip({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={mc.chip}>
      <Text style={[mc.value, { color }]}>{value}g</Text>
      <Text style={mc.label}>{label}</Text>
      <ProgressBar value={value} max={goal} color={color} />
      <Text style={mc.sub}>{goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0}% of {goal}g</Text>
    </View>
  );
}
const mc = StyleSheet.create({
  chip:  { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 10, gap: 4 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  sub:   { fontSize: 9, color: '#475569', marginTop: 2 },
});

// ── Add manually modal ────────────────────────────────────────────────────────

function AddManualModal({ onAdd, onClose }: {
  onAdd: (entry: MacroEntry) => void;
  onClose: () => void;
}) {
  const [name, setName]   = useState('');
  const [cal, setCal]     = useState('');
  const [pro, setPro]     = useState('0');
  const [carb, setCarb]   = useState('0');
  const [fat, setFat]     = useState('0');

  function add() {
    const calories = parseInt(cal);
    if (!name.trim() || !calories) return;
    const entry: MacroEntry = {
      id:        generateId(),
      date:      todayYMD(),
      timestamp: new Date().toISOString(),
      name:      name.trim(),
      calories,
      protein:   parseInt(pro)  || 0,
      carbs:     parseInt(carb) || 0,
      fat:       parseInt(fat)  || 0,
    };
    onAdd(entry);
    onClose();
  }

  return (
    <Modal visible animationType="slide" transparent>
      <View style={am.overlay}>
        <View style={am.sheet}>
          <View style={am.header}>
            <Text style={am.title}>Add Manually</Text>
            <TouchableOpacity onPress={onClose}><Text style={am.close}>✕</Text></TouchableOpacity>
          </View>

          <TextInput
            style={am.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Food name (e.g. Banana)"
            placeholderTextColor="#475569"
            autoFocus
          />

          <View style={am.macroRow}>
            {([
              ['Calories', 'kcal', cal, setCal, true],
              ['Protein',  'g',   pro, setPro, false],
              ['Carbs',    'g',  carb, setCarb, false],
              ['Fat',      'g',   fat, setFat, false],
            ] as [string, string, string, (v: string) => void, boolean][]).map(([lbl, unit, val, set, required]) => (
              <View key={lbl} style={am.macroField}>
                <Text style={[am.macroLabel, required && { color: '#10b981' }]}>{lbl}{required ? ' *' : ''}</Text>
                <TextInput
                  style={am.macroInput}
                  value={val}
                  onChangeText={set}
                  keyboardType="numeric"
                  selectTextOnFocus
                  placeholder="0"
                  placeholderTextColor="#334155"
                />
                <Text style={am.macroUnit}>{unit}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[am.addBtn, (!name.trim() || !cal) && am.addBtnOff]}
            onPress={add}
            disabled={!name.trim() || !cal}
          >
            <Text style={am.addTxt}>Add to Log</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const am = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14, paddingBottom: 36 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 17, fontWeight: '800', color: '#f1f5f9' },
  close:      { color: '#475569', fontSize: 20, padding: 4 },
  nameInput:  { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 15, fontWeight: '600', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  macroRow:   { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1, alignItems: 'center', gap: 4 },
  macroLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  macroInput: { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 15, fontWeight: '700', borderRadius: 8, paddingVertical: 8, width: '100%', textAlign: 'center' },
  macroUnit:  { fontSize: 9, color: '#475569' },
  addBtn:     { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnOff:  { backgroundColor: '#1e293b' },
  addTxt:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Edit entry modal ──────────────────────────────────────────────────────────

function EditEntryModal({ entry, onSave, onDelete, onClose }: {
  entry: MacroEntry;
  onSave:   (date: string, id: string, updates: any) => void;
  onDelete: (date: string, id: string) => void;
  onClose:  () => void;
}) {
  const [name, setName] = useState(entry.name);
  const [cal, setCal]   = useState(String(entry.calories));
  const [pro, setPro]   = useState(String(entry.protein));
  const [carb, setCarb] = useState(String(entry.carbs));
  const [fat, setFat]   = useState(String(entry.fat));

  function save() {
    onSave(entry.date, entry.id, {
      name,
      calories: parseInt(cal) || entry.calories,
      protein:  parseInt(pro) || entry.protein,
      carbs:    parseInt(carb) || entry.carbs,
      fat:      parseInt(fat) || entry.fat,
    });
    onClose();
  }

  function confirmDelete() {
    Alert.alert('Delete entry?', entry.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(entry.date, entry.id); onClose(); } },
    ]);
  }

  return (
    <Modal visible animationType="slide" transparent>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <Text style={em.title}>Edit Meal</Text>
            <TouchableOpacity onPress={onClose}><Text style={em.close}>✕</Text></TouchableOpacity>
          </View>
          <TextInput style={em.nameInput} value={name} onChangeText={setName} placeholder="Food name" placeholderTextColor="#475569" />
          <View style={em.macroRow}>
            {([
              ['Calories', 'kcal', cal, setCal],
              ['Protein',  'g',   pro, setPro],
              ['Carbs',    'g',  carb, setCarb],
              ['Fat',      'g',   fat, setFat],
            ] as [string, string, string, (v: string) => void][]).map(([lbl, unit, val, set]) => (
              <View key={lbl} style={em.macroField}>
                <Text style={em.macroLabel}>{lbl}</Text>
                <TextInput style={em.macroInput} value={val} onChangeText={set} keyboardType="numeric" selectTextOnFocus />
                <Text style={em.macroUnit}>{unit}</Text>
              </View>
            ))}
          </View>
          <View style={em.btns}>
            <TouchableOpacity style={[em.btn, { backgroundColor: '#334155' }]} onPress={confirmDelete}>
              <Text style={em.deleteTxt}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[em.btn, { backgroundColor: '#10b981' }]} onPress={save}>
              <Text style={em.saveTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const em = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14, paddingBottom: 36 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 17, fontWeight: '800', color: '#f1f5f9' },
  close:      { color: '#475569', fontSize: 18, padding: 4 },
  nameInput:  { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 15, fontWeight: '700', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  macroRow:   { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1, alignItems: 'center', gap: 4 },
  macroLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  macroInput: { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 15, fontWeight: '700', borderRadius: 8, paddingVertical: 8, width: '100%', textAlign: 'center' },
  macroUnit:  { fontSize: 9, color: '#475569' },
  btns:       { flexDirection: 'row', gap: 12 },
  btn:        { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteTxt:  { color: '#f87171', fontWeight: '700', fontSize: 15 },
  saveTxt:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Entry row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, onEdit, onDelete }: {
  entry:    MacroEntry;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  function confirmDelete() {
    Alert.alert('Delete?', entry.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }

  // Use a plain View so the delete button is not nested inside another Touchable.
  // Nested touchables on iOS allow the outer one to swallow the tap before the inner fires.
  return (
    <View style={er.row}>
      <TouchableOpacity style={er.content} onPress={onEdit} activeOpacity={0.7}>
        {entry.imageUri ? <Image source={{ uri: entry.imageUri }} style={er.thumb} /> : null}
        <View style={er.info}>
          <Text style={er.name} numberOfLines={1}>{entry.name}</Text>
          <Text style={er.macros}>P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g</Text>
        </View>
        <Text style={er.kcal}>{entry.calories} kcal</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={confirmDelete}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={er.delBtn}
      >
        <Text style={er.delTxt}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
}
const er = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb:   { width: 40, height: 40, borderRadius: 8, resizeMode: 'cover' },
  info:    { flex: 1 },
  name:    { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  macros:  { fontSize: 11, color: '#64748b', marginTop: 2 },
  kcal:   { fontSize: 14, fontWeight: '800', color: '#10b981' },
  delBtn: { padding: 4 },
  delTxt: { fontSize: 16 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CaloriesScreen() {
  const {
    todayLog, goals, loaded,
    addEntry, removeHistoryEntry, updateEntry, updateGoals,
    reloadHistory, reloadGoals,
  } = useCalorieStore();

  const [editEntry,  setEditEntry]  = useState<MacroEntry | null>(null);
  const [addManual,  setAddManual]  = useState(false);

  // Celebration
  const [toast, setToast]   = useState<string | null>(null);
  const toastAnim           = useRef(new Animated.Value(0)).current;
  const prevCount           = useRef<number | null>(null);

  // On focus: sync state + guard onboarding
  useFocusEffect(useCallback(() => {
    reloadHistory();
    reloadGoals();
    AsyncStorage.getItem(USER_PROFILE_KEY).then((raw) => {
      if (!(raw && JSON.parse(raw).onboardingComplete)) {
        router.replace('/calorie-onboarding');
      }
    });
  }, [reloadHistory, reloadGoals]));

  // Celebrate on new entry
  useEffect(() => {
    if (!loaded) return;
    const count = todayLog.entries.length;
    if (prevCount.current !== null && count > prevCount.current) {
      const newest = todayLog.entries[count - 1];
      showToast(`${newest.name} · +${newest.calories} kcal logged!`);
    }
    prevCount.current = count;
  }, [todayLog.entries.length, loaded]);

  function showToast(msg: string) {
    setToast(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, speed: 14 }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera access needed', 'Allow in Settings.'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      pendingImage.uri = a.uri; pendingImage.mimeType = a.mimeType ?? 'image/jpeg';
      router.push('/calorie-result');
    }
  }

  async function openLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Photo access needed', 'Allow in Settings.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      pendingImage.uri = a.uri; pendingImage.mimeType = a.mimeType ?? 'image/jpeg';
      router.push('/calorie-result');
    }
  }

  if (!loaded) return <View style={s.center}><Text style={s.loadTxt}>Loading…</Text></View>;

  const totals    = dayTotals(todayLog);
  const mainColor = calorieColor(totals.calories, goals.calories);
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header — date only, no gear icon */}
        <View style={s.header}>
          <Text style={s.headerDate}>{dateLabel}</Text>
          <Text style={s.headerSub}>Calorie Tracker</Text>
        </View>

        {/* Donut ring */}
        <View style={s.heroCard}>
          <DonutRing current={totals.calories} goal={goals.calories} color={mainColor} size={190} />
        </View>

        {/* Macro chips */}
        <View style={s.macroRow}>
          <MacroChip label="Protein" value={totals.protein} goal={goals.protein} color="#a78bfa" />
          <MacroChip label="Carbs"   value={totals.carbs}   goal={goals.carbs}   color="#f59e0b" />
          <MacroChip label="Fat"     value={totals.fat}      goal={goals.fat}     color="#f87171" />
        </View>

        {/* Scan row */}
        <View style={s.scanRow}>
          <TouchableOpacity style={s.scanMain} onPress={openCamera}>
            <Text style={s.scanIcon}>📷</Text>
            <Text style={s.scanTxt}>Scan Food</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.scanLib} onPress={openLibrary}>
            <Text style={s.scanIcon}>🖼️</Text>
            <Text style={s.scanLibTxt}>Library</Text>
          </TouchableOpacity>
        </View>

        {/* Add manually button */}
        <TouchableOpacity style={s.addManualBtn} onPress={() => setAddManual(true)}>
          <Text style={s.addManualIcon}>＋</Text>
          <Text style={s.addManualTxt}>Add Manually</Text>
        </TouchableOpacity>

        {/* Today's log */}
        <View style={s.logCard}>
          <View style={s.logHeader}>
            <Text style={s.logTitle}>Today's Meals</Text>
            <Text style={s.logCount}>{todayLog.entries.length} items</Text>
          </View>
          {todayLog.entries.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🍽️</Text>
              <Text style={s.emptyTxt}>No meals logged yet</Text>
              <Text style={s.emptySub}>Tap Scan Food or Add Manually to get started</Text>
            </View>
          ) : (
            [...todayLog.entries].reverse().map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onEdit={() => setEditEntry(entry)}
                onDelete={() => removeHistoryEntry(entry.date, entry.id)}
              />
            ))
          )}
        </View>

        {/* Bottom nav buttons */}
        <View style={s.bottomRow}>
          <TouchableOpacity style={[s.bottomBtn, s.bottomBtnPrimary]} onPress={() => router.push('/calorie-progress')}>
            <Text style={s.bottomBtnIcon}>📊</Text>
            <Text style={s.bottomBtnTxt}>Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bottomBtn, s.bottomBtnSecondary]} onPress={() => router.push('/calorie-settings')}>
            <Text style={s.bottomBtnIcon}>⚙️</Text>
            <Text style={[s.bottomBtnTxt, { color: '#94a3b8' }]}>Settings</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Celebration toast */}
      {toast && (
        <Animated.View style={[s.toast, {
          opacity:   toastAnim,
          transform: [{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        }]}>
          <Text style={s.toastIcon}>✓</Text>
          <Text style={s.toastTxt} numberOfLines={1}>{toast}</Text>
        </Animated.View>
      )}

      {/* Add manually modal */}
      {addManual && <AddManualModal onAdd={addEntry} onClose={() => setAddManual(false)} />}

      {/* Edit entry modal */}
      {editEntry && (
        <EditEntryModal
          entry={editEntry}
          onSave={updateEntry}
          onDelete={removeHistoryEntry}
          onClose={() => setEditEntry(null)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#111827' },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  loadTxt:          { color: '#64748b', fontSize: 15 },
  scroll:           { padding: 16, gap: 12, paddingBottom: 40 },

  header:           { gap: 2 },
  headerDate:       { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  headerSub:        { fontSize: 12, color: '#64748b' },

  heroCard:         { backgroundColor: '#1e293b', borderRadius: 24, padding: 20, alignItems: 'center' },
  macroRow:         { flexDirection: 'row', gap: 8 },

  scanRow:          { flexDirection: 'row', gap: 10 },
  scanMain:         { flex: 3, backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scanIcon:         { fontSize: 22 },
  scanTxt:          { fontSize: 16, fontWeight: '800', color: '#fff' },
  scanLib:          { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
  scanLibTxt:       { fontSize: 11, fontWeight: '600', color: '#94a3b8' },

  addManualBtn:     { backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#334155' },
  addManualIcon:    { fontSize: 18, color: '#10b981', fontWeight: '700' },
  addManualTxt:     { fontSize: 14, fontWeight: '700', color: '#94a3b8' },

  logCard:          { backgroundColor: '#1e293b', borderRadius: 20, padding: 16 },
  logHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logTitle:         { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  logCount:         { fontSize: 12, color: '#64748b' },
  empty:            { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyIcon:        { fontSize: 36 },
  emptyTxt:         { fontSize: 15, color: '#475569', fontWeight: '600' },
  emptySub:         { fontSize: 12, color: '#334155', textAlign: 'center' },

  bottomRow:        { flexDirection: 'row', gap: 10 },
  bottomBtn:        { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  bottomBtnPrimary: { backgroundColor: '#1e293b' },
  bottomBtnSecondary:{ backgroundColor: '#1e293b' },
  bottomBtnIcon:    { fontSize: 18 },
  bottomBtnTxt:     { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },

  toast:            { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#10b981', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  toastIcon:        { fontSize: 20 },
  toastTxt:         { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
});
