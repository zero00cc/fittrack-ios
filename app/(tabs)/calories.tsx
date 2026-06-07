import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Animated,
  StyleSheet, Alert, Modal, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCalorieStore } from '../../hooks/useCalorieStore';
import { CalorieGoals, MacroEntry } from '../../types/calorie.types';
import { dayTotals, calorieColor } from '../../utils/calorieUtils';
import { isoToDisplay } from '../../utils/dateUtils';

// ── Shared state for passing image to result screen ───────────────────────────
export const pendingImage = { uri: '', mimeType: 'image/jpeg' };

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);

  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { flex: anim, backgroundColor: color }]} />
      <View style={[pb.remainder, { flex: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) as any }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track:     { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#1e293b' },
  fill:      { borderRadius: 5 },
  remainder: { backgroundColor: '#1e293b' },
});

function MacroChip({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <View style={mc.chip}>
      <Text style={mc.value}>{value}g</Text>
      <Text style={mc.label}>{label}</Text>
      <ProgressBar value={value} max={goal} color={color} />
      <Text style={mc.pct}>{pct}% of {goal}g</Text>
    </View>
  );
}

const mc = StyleSheet.create({
  chip:  { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 10, gap: 4 },
  value: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  label: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pct:   { fontSize: 9, color: '#475569', marginTop: 2 },
});

// ── Goals editing modal ───────────────────────────────────────────────────────

function GoalsModal({ visible, goals, onSave, onClose }: {
  visible: boolean;
  goals: CalorieGoals;
  onSave: (g: CalorieGoals) => void;
  onClose: () => void;
}) {
  const [cal,  setCal]  = useState(String(goals.calories));
  const [prot, setProt] = useState(String(goals.protein));
  const [carb, setCarb] = useState(String(goals.carbs));
  const [fat,  setFat]  = useState(String(goals.fat));

  useEffect(() => {
    if (visible) {
      setCal(String(goals.calories));
      setProt(String(goals.protein));
      setCarb(String(goals.carbs));
      setFat(String(goals.fat));
    }
  }, [visible, goals]);

  function save() {
    const g: CalorieGoals = {
      calories: Math.max(1, parseInt(cal) || goals.calories),
      protein:  Math.max(1, parseInt(prot) || goals.protein),
      carbs:    Math.max(1, parseInt(carb) || goals.carbs),
      fat:      Math.max(1, parseInt(fat)  || goals.fat),
    };
    onSave(g);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={gm.overlay}>
        <View style={gm.sheet}>
          <Text style={gm.title}>Daily Goals</Text>
          {[
            { label: 'Calories (kcal)', val: cal, set: setCal },
            { label: 'Protein (g)',     val: prot, set: setProt },
            { label: 'Carbs (g)',       val: carb, set: setCarb },
            { label: 'Fat (g)',         val: fat,  set: setFat },
          ].map(({ label, val, set }) => (
            <View key={label} style={gm.row}>
              <Text style={gm.label}>{label}</Text>
              <TextInput
                style={gm.input}
                value={val}
                onChangeText={set}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          ))}
          <View style={gm.buttons}>
            <TouchableOpacity style={[gm.btn, gm.cancel]} onPress={onClose}>
              <Text style={gm.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[gm.btn, gm.save]} onPress={save}>
              <Text style={gm.saveTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const gm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  title:     { fontSize: 18, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label:     { fontSize: 14, color: '#94a3b8' },
  input:     { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 16, fontWeight: '700', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 100, textAlign: 'right' },
  buttons:   { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn:       { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancel:    { backgroundColor: '#334155' },
  save:      { backgroundColor: '#10b981' },
  cancelTxt: { color: '#94a3b8', fontWeight: '700', fontSize: 15 },
  saveTxt:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Entry row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, onRemove }: { entry: MacroEntry; onRemove: () => void }) {
  return (
    <View style={er.row}>
      {entry.imageUri && (
        <Image source={{ uri: entry.imageUri }} style={er.thumb} />
      )}
      <View style={er.info}>
        <Text style={er.name} numberOfLines={1}>{entry.name}</Text>
        <Text style={er.macros}>P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g</Text>
      </View>
      <Text style={er.kcal}>{entry.calories}</Text>
      <Text style={er.unit}>kcal</Text>
      <TouchableOpacity
        onPress={() => Alert.alert('Remove?', entry.name, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: onRemove },
        ])}
        style={er.del}
      >
        <Text style={er.delTxt}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const er = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b', gap: 8 },
  thumb:  { width: 40, height: 40, borderRadius: 8, resizeMode: 'cover' },
  info:   { flex: 1 },
  name:   { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
  macros: { fontSize: 11, color: '#64748b', marginTop: 2 },
  kcal:   { fontSize: 15, fontWeight: '800', color: '#10b981' },
  unit:   { fontSize: 10, color: '#64748b', marginBottom: 2 },
  del:    { padding: 6 },
  delTxt: { color: '#475569', fontSize: 14 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CaloriesScreen() {
  const { history, todayLog, goals, loaded, removeEntry, updateGoals, reloadHistory } = useCalorieStore();
  const [goalsOpen, setGoalsOpen] = useState(false);

  // Celebration state
  const [toast, setToast]   = useState<string | null>(null);
  const toastAnim           = useRef(new Animated.Value(0)).current;
  const prevCount           = useRef<number | null>(null);

  // Reload from AsyncStorage whenever this screen regains focus
  // (entries may have been added from the result screen)
  useFocusEffect(useCallback(() => {
    reloadHistory();
  }, [reloadHistory]));

  // Fire celebration when a new entry is detected after initial load
  useEffect(() => {
    if (!loaded) return;
    const count = todayLog.entries.length;
    if (prevCount.current !== null && count > prevCount.current) {
      const newest = todayLog.entries[count - 1];
      showToast(`${newest.name} — +${newest.calories} kcal logged!`);
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

  async function handleScanFood() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to scan food.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      pendingImage.uri      = asset.uri;
      pendingImage.mimeType = asset.mimeType ?? 'image/jpeg';
      router.push('/calorie-result');
    }
  }

  async function handlePhotoLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo access needed', 'Allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      pendingImage.uri      = asset.uri;
      pendingImage.mimeType = asset.mimeType ?? 'image/jpeg';
      router.push('/calorie-result');
    }
  }

  if (!loaded) {
    return (
      <View style={s.loadingCenter}>
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  const totals    = dayTotals(todayLog);
  const mainColor = calorieColor(totals.calories, goals.calories);
  const remaining = goals.calories - totals.calories;
  const today     = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerDate}>{today}</Text>
            <Text style={s.headerSub}>Calorie Tracker</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={() => setGoalsOpen(true)} style={s.iconBtn}>
              <Text style={s.iconBtnTxt}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/calorie-progress')} style={s.iconBtn}>
              <Text style={s.iconBtnTxt}>📊</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calorie hero card */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View>
              <Text style={[s.heroNumber, { color: mainColor }]}>{totals.calories.toLocaleString()}</Text>
              <Text style={s.heroUnit}>kcal consumed</Text>
            </View>
            <View style={s.heroRight}>
              <Text style={s.heroGoalLabel}>Goal</Text>
              <Text style={s.heroGoal}>{goals.calories.toLocaleString()}</Text>
              <Text style={s.heroRemain}>
                {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
              </Text>
            </View>
          </View>
          <ProgressBar value={totals.calories} max={goals.calories} color={mainColor} />
        </View>

        {/* Macro chips */}
        <View style={s.macroRow}>
          <MacroChip label="Protein" value={totals.protein} goal={goals.protein} color="#a78bfa" />
          <MacroChip label="Carbs"   value={totals.carbs}   goal={goals.carbs}   color="#f59e0b" />
          <MacroChip label="Fat"     value={totals.fat}      goal={goals.fat}     color="#f87171" />
        </View>

        {/* Scan buttons */}
        <View style={s.scanRow}>
          <TouchableOpacity style={s.scanMain} onPress={handleScanFood}>
            <Text style={s.scanMainIcon}>📷</Text>
            <Text style={s.scanMainTxt}>Scan Food</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.scanLib} onPress={handlePhotoLibrary}>
            <Text style={s.scanLibIcon}>🖼️</Text>
            <Text style={s.scanLibTxt}>Library</Text>
          </TouchableOpacity>
        </View>

        {/* Today's log */}
        <View style={s.logCard}>
          <View style={s.logHeader}>
            <Text style={s.logTitle}>Today's Meals</Text>
            <Text style={s.logCount}>{todayLog.entries.length} logged</Text>
          </View>
          {todayLog.entries.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🍽️</Text>
              <Text style={s.emptyTxt}>No meals logged yet</Text>
              <Text style={s.emptySub}>Tap "Scan Food" to log your first meal</Text>
            </View>
          ) : (
            [...todayLog.entries].reverse().map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onRemove={() => removeEntry(entry.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Celebration toast */}
      {toast && (
        <Animated.View style={[
          s.toast,
          {
            opacity:   toastAnim,
            transform: [{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          },
        ]}>
          <Text style={s.toastIcon}>✓</Text>
          <Text style={s.toastTxt}>{toast}</Text>
        </Animated.View>
      )}

      {/* Goals modal */}
      <GoalsModal
        visible={goalsOpen}
        goals={goals}
        onSave={updateGoals}
        onClose={() => setGoalsOpen(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#111827' },
  loadingCenter:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  loadingText:  { color: '#64748b', fontSize: 15 },
  scroll:       { padding: 16, gap: 12, paddingBottom: 32 },

  // Header
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  headerDate:   { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  headerSub:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  headerActions:{ flexDirection: 'row', gap: 4 },
  iconBtn:      { padding: 8, backgroundColor: '#1e293b', borderRadius: 10 },
  iconBtnTxt:   { fontSize: 18 },

  // Hero calorie card
  heroCard:     { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, gap: 14 },
  heroTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroNumber:   { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  heroUnit:     { fontSize: 12, color: '#64748b', fontWeight: '600' },
  heroRight:    { alignItems: 'flex-end', gap: 2 },
  heroGoalLabel:{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroGoal:     { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  heroRemain:   { fontSize: 12, color: '#64748b' },

  // Macro chips
  macroRow:     { flexDirection: 'row', gap: 8 },

  // Scan buttons
  scanRow:      { flexDirection: 'row', gap: 10 },
  scanMain:     { flex: 3, backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  scanMainIcon: { fontSize: 22 },
  scanMainTxt:  { fontSize: 16, fontWeight: '800', color: '#fff' },
  scanLib:      { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
  scanLibIcon:  { fontSize: 20 },
  scanLibTxt:   { fontSize: 11, fontWeight: '600', color: '#94a3b8' },

  // Log
  logCard:      { backgroundColor: '#1e293b', borderRadius: 20, padding: 16 },
  logHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logTitle:     { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  logCount:     { fontSize: 12, color: '#64748b' },
  empty:        { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyIcon:    { fontSize: 36 },
  emptyTxt:     { fontSize: 15, color: '#475569', fontWeight: '600' },
  emptySub:     { fontSize: 12, color: '#334155', textAlign: 'center' },

  // Toast
  toast:        {
    position:       'absolute',
    bottom:         32,
    left:           16,
    right:          16,
    backgroundColor: '#10b981',
    borderRadius:   16,
    padding:        16,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    shadowColor:    '#10b981',
    shadowOpacity:  0.4,
    shadowRadius:   12,
    shadowOffset:   { width: 0, height: 4 },
  },
  toastIcon:    { fontSize: 20 },
  toastTxt:     { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
});
