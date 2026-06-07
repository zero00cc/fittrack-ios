import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCalorieStore } from '../hooks/useCalorieStore';
import { MacroEntry } from '../types/calorie.types';
import { generateId } from '../utils/calorieUtils';
import { todayYMD } from '../utils/dateUtils';
// pendingImage.date is set by the main screen before navigating here
import { analyzeFood, AnalyzedItem } from '../utils/analyzeFood';
import { pendingImage } from './(tabs)/calories';

interface EditableItem extends AnalyzedItem {
  uid:      string;
  included: boolean;
}

function MacroField({ label, value, color, onChange }: {
  label:    string;
  value:    number;
  color:    string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={mf.wrap}>
      <Text style={[mf.label, { color }]}>{label}</Text>
      <TextInput
        style={mf.input}
        value={String(value)}
        onChangeText={(t) => { const n = parseInt(t); onChange(isNaN(n) ? 0 : Math.max(0, n)); }}
        keyboardType="numeric"
        selectTextOnFocus
      />
      <Text style={mf.unit}>{label === 'Calories' ? 'kcal' : 'g'}</Text>
    </View>
  );
}

const mf = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 16, fontWeight: '700', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, width: '100%', textAlign: 'center' },
  unit:  { fontSize: 9, color: '#475569' },
});

function ItemCard({ item, onUpdate, onToggle }: {
  item:     EditableItem;
  onUpdate: (uid: string, field: keyof AnalyzedItem, value: number | string) => void;
  onToggle: (uid: string) => void;
}) {
  return (
    <View style={[ic.card, !item.included && ic.cardOff]}>
      <View style={ic.top}>
        <TouchableOpacity onPress={() => onToggle(item.uid)} style={ic.checkbox}>
          <Text style={ic.checkTxt}>{item.included ? '☑' : '☐'}</Text>
        </TouchableOpacity>
        <TextInput
          style={ic.nameInput}
          value={item.name}
          onChangeText={(t) => onUpdate(item.uid, 'name', t)}
          placeholder="Food name"
          placeholderTextColor="#475569"
        />
      </View>
      {item.included && (
        <View style={ic.macros}>
          <MacroField label="Calories" value={item.calories} color="#10b981" onChange={(v) => onUpdate(item.uid, 'calories', v)} />
          <MacroField label="Protein"  value={item.protein}  color="#a78bfa" onChange={(v) => onUpdate(item.uid, 'protein', v)} />
          <MacroField label="Carbs"    value={item.carbs}    color="#f59e0b" onChange={(v) => onUpdate(item.uid, 'carbs', v)} />
          <MacroField label="Fat"      value={item.fat}      color="#f87171" onChange={(v) => onUpdate(item.uid, 'fat', v)} />
        </View>
      )}
    </View>
  );
}

const ic = StyleSheet.create({
  card:      { backgroundColor: '#1e293b', borderRadius: 16, padding: 14, gap: 12 },
  cardOff:   { opacity: 0.45 },
  top:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox:  { padding: 2 },
  checkTxt:  { fontSize: 22, color: '#10b981' },
  nameInput: { flex: 1, fontSize: 15, fontWeight: '700', color: '#f1f5f9', backgroundColor: '#0f172a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  macros:    { flexDirection: 'row', gap: 8 },
});

export default function CalorieResultScreen() {
  const { addEntry } = useCalorieStore();
  const imageUri  = pendingImage.uri;
  const mimeType  = pendingImage.mimeType;
  const entryDate = pendingImage.date || todayYMD();

  const [status,  setStatus]  = useState<'loading' | 'ready' | 'error'>('loading');
  const [desc,    setDesc]    = useState('');
  const [items,   setItems]   = useState<EditableItem[]>([]);
  const [errorMsg, setError]  = useState('');
  const analyzedRef = useRef(false);

  useEffect(() => {
    if (analyzedRef.current || !imageUri) return;
    analyzedRef.current = true;

    analyzeFood(imageUri, mimeType)
      .then((result) => {
        setDesc(result.description);
        setItems(result.items.map((item) => ({ ...item, uid: generateId(), included: true })));
        setStatus('ready');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
        setStatus('error');
      });
  }, []);

  function update(uid: string, field: keyof AnalyzedItem, value: number | string) {
    setItems((prev) => prev.map((i) => i.uid === uid ? { ...i, [field]: value } : i));
  }

  function toggle(uid: string) {
    setItems((prev) => prev.map((i) => i.uid === uid ? { ...i, included: !i.included } : i));
  }

  function addToLog() {
    const included = items.filter((i) => i.included);
    included.forEach((item) => {
      const entry: MacroEntry = {
        id:        generateId(),
        date:      entryDate,
        timestamp: new Date().toISOString(),
        name:      item.name,
        imageUri:  imageUri || undefined,
        calories:  item.calories,
        protein:   item.protein,
        carbs:     item.carbs,
        fat:       item.fat,
      };
      addEntry(entry);
    });
    router.back();
  }

  const included  = items.filter((i) => i.included);
  const totalKcal = included.reduce((s, i) => s + i.calories, 0);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.heroImg} />
        ) : null}
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={s.loadingTxt}>Analyzing your meal…</Text>
          <Text style={s.loadingSub}>Identifying food and estimating macros</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <View style={s.errorBox}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorTxt}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.retryBtn}>
            <Text style={s.retryTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Ready ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Food photo */}
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.heroImg} />
          ) : null}

          {/* AI description */}
          {desc ? (
            <View style={s.descBox}>
              <Text style={s.descLabel}>AI Detected</Text>
              <Text style={s.descTxt}>{desc}</Text>
            </View>
          ) : null}

          {/* Food items */}
          <Text style={s.sectionTitle}>Edit & Confirm</Text>
          <Text style={s.sectionSub}>Tap values to adjust if the AI estimate is off.</Text>

          <View style={s.itemList}>
            {items.map((item) => (
              <ItemCard key={item.uid} item={item} onUpdate={update} onToggle={toggle} />
            ))}
          </View>

          <View style={s.spacer} />
        </ScrollView>

        {/* Sticky footer */}
        <View style={s.footer}>
          <View style={s.footerInfo}>
            <Text style={s.footerKcal}>{totalKcal}</Text>
            <Text style={s.footerUnit}>kcal</Text>
            <Text style={s.footerItems}>{included.length} item{included.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={[s.addBtn, included.length === 0 && s.addBtnDisabled]}
            onPress={addToLog}
            disabled={included.length === 0}
          >
            <Text style={s.addBtnTxt}>Add to Log</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#111827' },
  heroImg:     { width: '100%', height: 240, resizeMode: 'cover' },
  scroll:      { padding: 16, gap: 12 },

  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  loadingTxt:  { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  loadingSub:  { fontSize: 13, color: '#64748b', textAlign: 'center' },

  errorBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorIcon:   { fontSize: 48 },
  errorTxt:    { fontSize: 15, color: '#f87171', textAlign: 'center', lineHeight: 22 },
  retryBtn:    { backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryTxt:    { color: '#94a3b8', fontWeight: '700', fontSize: 15 },

  descBox:     { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, gap: 4 },
  descLabel:   { fontSize: 10, color: '#10b981', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  descTxt:     { fontSize: 13, color: '#94a3b8', lineHeight: 20 },

  sectionTitle:{ fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  sectionSub:  { fontSize: 12, color: '#475569', marginTop: -8 },

  itemList:    { gap: 10 },
  spacer:      { height: 16 },

  footer:      { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 24, backgroundColor: '#111827', borderTopWidth: 1, borderTopColor: '#1e293b', gap: 16 },
  footerInfo:  { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  footerKcal:  { fontSize: 26, fontWeight: '900', color: '#10b981' },
  footerUnit:  { fontSize: 12, color: '#64748b' },
  footerItems: { fontSize: 12, color: '#475569', marginLeft: 4 },
  addBtn:      { flex: 1, backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  addBtnDisabled: { backgroundColor: '#1e293b' },
  addBtnTxt:   { color: '#fff', fontSize: 16, fontWeight: '800' },
});
