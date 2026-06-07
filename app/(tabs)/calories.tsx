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
import { dayTotals, calorieColor } from '../../utils/calorieUtils';
import { DonutRing } from '../../components/calorie/DonutRing';
import { USER_PROFILE_KEY } from '../calorie-onboarding';

// Shared state for passing image URI to the result screen
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
      <View style={[pb.bg, { flex: anim.interpolate({ inputRange: [0,1], outputRange: [1,0] }) as any }]} />
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
      <Text style={mc.sub}>{goal > 0 ? Math.min(100, Math.round((value/goal)*100)) : 0}% of {goal}g</Text>
    </View>
  );
}
const mc = StyleSheet.create({
  chip:  { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 10, gap: 4 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  sub:   { fontSize: 9, color: '#475569', marginTop: 2 },
});

// ── Goals modal ───────────────────────────────────────────────────────────────

function GoalsModal({ visible, goals, onSave, onClose, onResetOnboarding }: {
  visible: boolean; goals: CalorieGoals;
  onSave: (g: CalorieGoals) => void;
  onClose: () => void;
  onResetOnboarding: () => void;
}) {
  const [cal, setCal]   = useState(String(goals.calories));
  const [pro, setPro]   = useState(String(goals.protein));
  const [carb, setCarb] = useState(String(goals.carbs));
  const [fat, setFat]   = useState(String(goals.fat));

  useEffect(() => {
    if (visible) { setCal(String(goals.calories)); setPro(String(goals.protein)); setCarb(String(goals.carbs)); setFat(String(goals.fat)); }
  }, [visible, goals]);

  function save() {
    onSave({ calories: parseInt(cal)||goals.calories, protein: parseInt(pro)||goals.protein, carbs: parseInt(carb)||goals.carbs, fat: parseInt(fat)||goals.fat });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={gm.overlay}>
        <View style={gm.sheet}>
          <Text style={gm.title}>Daily Goals</Text>
          {[['Calories (kcal)', cal, setCal],['Protein (g)', pro, setPro],['Carbs (g)', carb, setCarb],['Fat (g)', fat, setFat]].map(([lbl, val, set]: any) => (
            <View key={lbl} style={gm.row}>
              <Text style={gm.rowLabel}>{lbl}</Text>
              <TextInput style={gm.input} value={val} onChangeText={set} keyboardType="numeric" selectTextOnFocus />
            </View>
          ))}
          <View style={gm.btns}>
            <TouchableOpacity style={[gm.btn, { backgroundColor: '#334155' }]} onPress={onClose}><Text style={gm.btnTxtGrey}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[gm.btn, { backgroundColor: '#10b981' }]} onPress={save}><Text style={gm.btnTxtWhite}>Save</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={gm.recalc} onPress={() => { onClose(); onResetOnboarding(); }}>
            <Text style={gm.recalcTxt}>↻  Recalculate from my profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const gm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  title:      { fontSize: 18, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel:   { fontSize: 14, color: '#94a3b8' },
  input:      { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 16, fontWeight: '700', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 100, textAlign: 'right' },
  btns:       { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn:        { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnTxtGrey: { color: '#94a3b8', fontWeight: '700', fontSize: 15 },
  btnTxtWhite:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  recalc:     { alignSelf: 'center', paddingVertical: 8 },
  recalcTxt:  { color: '#10b981', fontSize: 13, fontWeight: '600' },
});

// ── Edit entry modal ──────────────────────────────────────────────────────────

function EditEntryModal({ entry, onSave, onDelete, onClose }: {
  entry: MacroEntry;
  onSave: (date: string, id: string, updates: any) => void;
  onDelete: (date: string, id: string) => void;
  onClose: () => void;
}) {
  const [name, setName]   = useState(entry.name);
  const [cal, setCal]     = useState(String(entry.calories));
  const [pro, setPro]     = useState(String(entry.protein));
  const [carb, setCarb]   = useState(String(entry.carbs));
  const [fat, setFat]     = useState(String(entry.fat));

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
            {[['Calories','kcal',cal,setCal],['Protein','g',pro,setPro],['Carbs','g',carb,setCarb],['Fat','g',fat,setFat]].map(([lbl,unit,val,set]: any) => (
              <View key={lbl} style={em.macroField}>
                <Text style={em.macroLabel}>{lbl}</Text>
                <TextInput style={em.macroInput} value={val} onChangeText={set} keyboardType="numeric" selectTextOnFocus />
                <Text style={em.macroUnit}>{unit}</Text>
              </View>
            ))}
          </View>
          <View style={em.btns}>
            <TouchableOpacity style={[em.btn, { backgroundColor: '#334155' }]} onPress={confirmDelete}><Text style={em.btnRed}>Delete</Text></TouchableOpacity>
            <TouchableOpacity style={[em.btn, { backgroundColor: '#10b981' }]} onPress={save}><Text style={em.btnWhite}>Save</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const em = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 17, fontWeight: '800', color: '#f1f5f9' },
  close:      { color: '#475569', fontSize: 18, padding: 4 },
  nameInput:  { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 15, fontWeight: '700', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  macroRow:   { flexDirection: 'row', gap: 8 },
  macroField: { flex: 1, alignItems: 'center', gap: 4 },
  macroLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  macroInput: { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 15, fontWeight: '700', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 8, width: '100%', textAlign: 'center' },
  macroUnit:  { fontSize: 9, color: '#475569' },
  btns:       { flexDirection: 'row', gap: 12 },
  btn:        { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnRed:     { color: '#f87171', fontWeight: '700', fontSize: 15 },
  btnWhite:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Entry row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, onPress }: { entry: MacroEntry; onPress: () => void }) {
  return (
    <TouchableOpacity style={er.row} onPress={onPress} activeOpacity={0.7}>
      {entry.imageUri && <Image source={{ uri: entry.imageUri }} style={er.thumb} />}
      <View style={er.info}>
        <Text style={er.name} numberOfLines={1}>{entry.name}</Text>
        <Text style={er.macros}>P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g</Text>
      </View>
      <Text style={er.kcal}>{entry.calories} kcal</Text>
      <Text style={er.editHint}>✎</Text>
    </TouchableOpacity>
  );
}
const er = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f172a', gap: 8 },
  thumb:   { width: 40, height: 40, borderRadius: 8, resizeMode: 'cover' },
  info:    { flex: 1 },
  name:    { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  macros:  { fontSize: 11, color: '#64748b', marginTop: 2 },
  kcal:    { fontSize: 14, fontWeight: '800', color: '#10b981' },
  editHint:{ color: '#334155', fontSize: 16, paddingLeft: 6 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export default function CaloriesScreen() {
  const { history, todayLog, goals, loaded, addEntry, removeHistoryEntry, updateEntry, updateGoals, reloadHistory } = useCalorieStore();
  const [goalsOpen, setGoalsOpen]     = useState(false);
  const [editEntry, setEditEntry]     = useState<MacroEntry | null>(null);

  // Celebration toast
  const [toast, setToast]     = useState<string | null>(null);
  const toastAnim             = useRef(new Animated.Value(0)).current;
  const prevCount             = useRef<number | null>(null);

  // On focus: reload history + check onboarding
  useFocusEffect(useCallback(() => {
    reloadHistory();
    AsyncStorage.getItem(USER_PROFILE_KEY).then((raw) => {
      const profile = raw ? JSON.parse(raw) : null;
      if (!profile?.onboardingComplete) {
        router.replace('/calorie-onboarding');
      }
    });
  }, [reloadHistory]));

  // Celebration when new entry added
  useEffect(() => {
    if (!loaded) return;
    const count = todayLog.entries.length;
    if (prevCount.current !== null && count > prevCount.current) {
      const newest = todayLog.entries[count - 1];
      triggerToast(`${newest.name} · +${newest.calories} kcal logged!`);
    }
    prevCount.current = count;
  }, [todayLog.entries.length, loaded]);

  function triggerToast(msg: string) {
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
      pendingImage.uri = res.assets[0].uri; pendingImage.mimeType = res.assets[0].mimeType ?? 'image/jpeg';
      router.push('/calorie-result');
    }
  }

  async function openLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Photo access needed', 'Allow in Settings.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      pendingImage.uri = res.assets[0].uri; pendingImage.mimeType = res.assets[0].mimeType ?? 'image/jpeg';
      router.push('/calorie-result');
    }
  }

  function resetOnboarding() {
    AsyncStorage.removeItem(USER_PROFILE_KEY).then(() => router.push('/calorie-onboarding'));
  }

  if (!loaded) return <View style={s.center}><Text style={s.loadTxt}>Loading…</Text></View>;

  const totals    = dayTotals(todayLog);
  const mainColor = calorieColor(totals.calories, goals.calories);
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerDate}>{todayDate}</Text>
            <Text style={s.headerSub}>Calorie Tracker</Text>
          </View>
          <TouchableOpacity onPress={() => setGoalsOpen(true)} style={s.gearBtn}>
            <Text style={s.gearTxt}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Donut ring hero */}
        <View style={s.heroCard}>
          <DonutRing current={totals.calories} goal={goals.calories} color={mainColor} size={190} />
        </View>

        {/* Macro chips */}
        <View style={s.macroRow}>
          <MacroChip label="Protein" value={totals.protein} goal={goals.protein} color="#a78bfa" />
          <MacroChip label="Carbs"   value={totals.carbs}   goal={goals.carbs}   color="#f59e0b" />
          <MacroChip label="Fat"     value={totals.fat}      goal={goals.fat}     color="#f87171" />
        </View>

        {/* Scan buttons */}
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
              <Text style={s.emptySub}>Tap Scan Food to log your first meal</Text>
            </View>
          ) : (
            [...todayLog.entries].reverse().map((entry) => (
              <EntryRow key={entry.id} entry={entry} onPress={() => setEditEntry(entry)} />
            ))
          )}
        </View>

        {/* Progress & History button */}
        <TouchableOpacity style={s.historyBtn} onPress={() => router.push('/calorie-progress')}>
          <Text style={s.historyBtnIcon}>📊</Text>
          <Text style={s.historyBtnTxt}>View Progress & History</Text>
          <Text style={s.historyBtnArrow}>→</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Celebration toast */}
      {toast && (
        <Animated.View style={[s.toast, {
          opacity:   toastAnim,
          transform: [{ scale: toastAnim.interpolate({ inputRange: [0,1], outputRange: [0.9,1] }) }],
        }]}>
          <Text style={s.toastIcon}>✓</Text>
          <Text style={s.toastTxt} numberOfLines={1}>{toast}</Text>
        </Animated.View>
      )}

      {/* Goals modal */}
      <GoalsModal
        visible={goalsOpen}
        goals={goals}
        onSave={updateGoals}
        onClose={() => setGoalsOpen(false)}
        onResetOnboarding={resetOnboarding}
      />

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
  safe:        { flex: 1, backgroundColor: '#111827' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  loadTxt:     { color: '#64748b', fontSize: 15 },
  scroll:      { padding: 16, gap: 12, paddingBottom: 40 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDate:  { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  headerSub:   { fontSize: 12, color: '#64748b', marginTop: 2 },
  gearBtn:     { padding: 8, backgroundColor: '#1e293b', borderRadius: 10 },
  gearTxt:     { fontSize: 18 },

  heroCard:    { backgroundColor: '#1e293b', borderRadius: 24, padding: 20, alignItems: 'center' },

  macroRow:    { flexDirection: 'row', gap: 8 },

  scanRow:     { flexDirection: 'row', gap: 10 },
  scanMain:    { flex: 3, backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  scanIcon:    { fontSize: 22 },
  scanTxt:     { fontSize: 16, fontWeight: '800', color: '#fff' },
  scanLib:     { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
  scanLibTxt:  { fontSize: 11, fontWeight: '600', color: '#94a3b8' },

  logCard:     { backgroundColor: '#1e293b', borderRadius: 20, padding: 16 },
  logHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logTitle:    { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  logCount:    { fontSize: 12, color: '#64748b' },
  empty:       { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyIcon:   { fontSize: 36 },
  emptyTxt:    { fontSize: 15, color: '#475569', fontWeight: '600' },
  emptySub:    { fontSize: 12, color: '#334155', textAlign: 'center' },

  historyBtn:  { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyBtnIcon:{ fontSize: 20 },
  historyBtnTxt: { flex: 1, fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  historyBtnArrow: { fontSize: 18, color: '#10b981', fontWeight: '700' },

  toast:       { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#10b981', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  toastIcon:   { fontSize: 20 },
  toastTxt:    { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
});
