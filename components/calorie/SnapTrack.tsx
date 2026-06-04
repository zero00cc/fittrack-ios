import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, TextInput,
  ScrollView, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { MealEntry } from '../../types/calorie.types';
import { buildMealEntry, generateId } from '../../utils/calorieUtils';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';
const MODEL = 'claude-haiku-4-5-20251001';

interface AnalyzedItem {
  name: string;
  estimatedGrams: number;
  estimatedKcal: number;
}

interface EditableItem extends AnalyzedItem {
  uid: string;
  editedGrams: number;
  editedKcal: number;
}

interface Props {
  onAddEntries: (entries: MealEntry[]) => void;
}

async function analyzeImage(base64: string, mimeType: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: 'Analyze this food image. Return ONLY a JSON object (no markdown, no code blocks) with: {"description":"short description","items":[{"name":"food name","estimatedGrams":number,"estimatedKcal":number}]}. Estimate realistic portion sizes.',
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message ?? `Server error ${res.status}`);
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  const clean = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(clean) as { description: string; items: AnalyzedItem[] };
}

export function SnapTrack({ onAddEntries }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'results' | 'error'>('idle');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  async function processImage(uri: string, mimeType: string) {
    setPreviewUri(uri);
    setStatus('loading');
    setErrorMsg('');
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const result = await analyzeImage(base64, mimeType);
      setItems(result.items.map((item) => ({
        ...item,
        uid: generateId(),
        editedGrams: item.estimatedGrams,
        editedKcal: item.estimatedKcal,
      })));
      setDescription(result.description ?? '');
      setStatus('results');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze image.');
      setStatus('error');
    }
  }

  async function handleCamera() {
    const { status: perm } = await ImagePicker.requestCameraPermissionsAsync();
    if (perm !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access in Settings.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      processImage(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
    }
  }

  async function handleLibrary() {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access in Settings.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      processImage(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
    }
  }

  function updateGrams(uid: string, grams: number) {
    setItems((prev) => prev.map((item) => {
      if (item.uid !== uid) return item;
      const rate = item.estimatedGrams > 0 ? item.estimatedKcal / item.estimatedGrams : 1;
      return { ...item, editedGrams: grams, editedKcal: Math.round(grams * rate) };
    }));
  }

  function addItem(uid: string) {
    const item = items.find((i) => i.uid === uid);
    if (!item) return;
    const food = {
      id: `snap-${generateId()}`, name: item.name,
      caloriesPer100g: item.editedGrams > 0 ? Math.round((item.editedKcal / item.editedGrams) * 100) : 100,
      category: 'other' as const,
    };
    onAddEntries([buildMealEntry(food, item.editedGrams)]);
    setItems((prev) => prev.filter((i) => i.uid !== uid));
  }

  function addAll() {
    onAddEntries(items.map((item) => {
      const food = {
        id: `snap-${generateId()}`, name: item.name,
        caloriesPer100g: item.editedGrams > 0 ? Math.round((item.editedKcal / item.editedGrams) * 100) : 100,
        category: 'other' as const,
      };
      return buildMealEntry(food, item.editedGrams);
    }));
    reset();
  }

  function reset() {
    setStatus('idle');
    setPreviewUri(null);
    setItems([]);
    setDescription('');
    setErrorMsg('');
  }

  // ── Idle ──────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📷 Analyze Food Photo</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={handleCamera}>
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={handleLibrary}>
            <Text style={styles.photoBtnIcon}>🖼️</Text>
            <Text style={styles.photoBtnText}>Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📷 Analyze Food Photo</Text>
        {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} />}
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#10b981" />
          <Text style={styles.loadingText}>Analyzing your food…</Text>
        </View>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📷 Analyze Food Photo</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity onPress={reset} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Results ───────────────────────────────────────────────────────
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>📷 Analyze Food Photo</Text>
        <TouchableOpacity onPress={reset}>
          <Text style={styles.startOver}>Start over</Text>
        </TouchableOpacity>
      </View>

      {previewUri && (
        <View style={styles.resultTop}>
          <Image source={{ uri: previewUri }} style={styles.previewSmall} />
          <Text style={styles.descText} numberOfLines={4}>{description}</Text>
        </View>
      )}

      {items.length === 0 ? (
        <Text style={styles.allAdded}>All items added to log ✓</Text>
      ) : (
        <>
          <View style={styles.tableHeader}>
            <Text style={[styles.col, { flex: 2 }]}>Food</Text>
            <Text style={[styles.col, styles.colRight, { flex: 1 }]}>g</Text>
            <Text style={[styles.col, styles.colRight, { flex: 1 }]}>kcal</Text>
            <Text style={[styles.col, { width: 56 }]}></Text>
          </View>

          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
            {items.map((item) => (
              <View key={item.uid} style={styles.itemRow}>
                <Text style={[styles.col, { flex: 2 }]} numberOfLines={2}>{item.name}</Text>
                <TextInput
                  style={[styles.gramsInput, { flex: 1 }]}
                  value={String(item.editedGrams)}
                  onChangeText={(t) => updateGrams(item.uid, Math.max(1, parseInt(t) || 1))}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <Text style={[styles.col, styles.colRight, { flex: 1 }]}>{item.editedKcal}</Text>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => setItems((p) => p.filter((i) => i.uid !== item.uid))} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => addItem(item.uid)} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.addAllBtn} onPress={addAll}>
            <Text style={styles.addAllText}>
              Add All ({items.reduce((s, i) => s + i.editedKcal, 0)} kcal)
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  startOver: { fontSize: 12, color: '#9ca3af' },
  btnRow: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed', padding: 16, alignItems: 'center', gap: 6 },
  photoBtnIcon: { fontSize: 28 },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  preview: { width: '100%', height: 180, borderRadius: 10, resizeMode: 'cover' },
  previewSmall: { width: 72, height: 72, borderRadius: 8, resizeMode: 'cover' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 12 },
  loadingText: { fontSize: 13, color: '#6b7280' },
  errorText: { fontSize: 13, color: '#ef4444', textAlign: 'center' },
  retryBtn: { alignSelf: 'center' },
  retryText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
  resultTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  descText: { flex: 1, fontSize: 12, color: '#6b7280', fontStyle: 'italic', lineHeight: 18 },
  allAdded: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 4 },
  col: { fontSize: 11, color: '#374151' },
  colRight: { textAlign: 'right' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  gramsInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, fontSize: 11, textAlign: 'right' },
  itemActions: { width: 56, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: '#d1d5db', fontSize: 13, fontWeight: '700' },
  addBtn: { padding: 4 },
  addBtnText: { color: '#10b981', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  addAllBtn: { backgroundColor: '#10b981', borderRadius: 10, padding: 12, alignItems: 'center' },
  addAllText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
