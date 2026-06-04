import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, FlatList, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalorieStore } from '../../hooks/useCalorieStore';
import { foods, foodCategories } from '../../data/foods';
import { buildMealEntry, calcDayTotal, getCalorieStatus, statusColor } from '../../utils/calorieUtils';
import { FoodItem } from '../../types/calorie.types';
import { isoToDisplay } from '../../utils/dateUtils';

export default function CaloriesScreen() {
  const { todayLog, settings, loaded, addEntry, removeEntry, setTarget } = useCalorieStore();
  const [foodModal, setFoodModal] = useState(false);
  const [targetModal, setTargetModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState('100');
  const [targetInput, setTargetInput] = useState(String(settings.dailyTarget));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  if (!loaded) return <View style={styles.center}><Text style={styles.loading}>Loading…</Text></View>;

  const total = calcDayTotal(todayLog);
  const status = getCalorieStatus(total, settings.dailyTarget);
  const color = statusColor(status);
  const pct = Math.min(100, Math.round((total / settings.dailyTarget) * 100));

  const filteredFoods = foods.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || f.category === category;
    return matchSearch && matchCat;
  });

  function handleAddEntry() {
    if (!selectedFood) return;
    const g = parseInt(grams, 10);
    if (!g || g <= 0) return;
    addEntry(buildMealEntry(selectedFood, g));
    setSelectedFood(null);
    setGrams('100');
    setFoodModal(false);
  }

  function handleSaveTarget() {
    const t = parseInt(targetInput, 10);
    if (t > 0) setTarget(t);
    setTargetModal(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Summary card */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Today's Total</Text>
              <Text style={[styles.summaryTotal, { color }]}>{total} kcal</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>Target</Text>
              <TouchableOpacity onPress={() => { setTargetInput(String(settings.dailyTarget)); setTargetModal(true); }}>
                <Text style={styles.targetBtn}>{settings.dailyTarget} kcal ✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={[styles.pctLabel, { color }]}>{pct}% of target</Text>
        </View>

        {/* Add meal button */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setFoodModal(true)}>
          <Text style={styles.addBtnText}>+ Add Meal Entry</Text>
        </TouchableOpacity>

        {/* Today's log */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Today's Log</Text>
          {todayLog.entries.length === 0 ? (
            <Text style={styles.empty}>No meals logged yet.</Text>
          ) : (
            todayLog.entries.map((entry) => (
              <View key={entry.id} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{entry.foodName}</Text>
                  <Text style={styles.entryMeta}>{entry.weightGrams}g · {isoToDisplay(entry.timestamp.slice(0, 10))}</Text>
                </View>
                <Text style={styles.entryKcal}>{entry.calories} kcal</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Remove entry?', entry.foodName, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeEntry(entry.id) },
                  ])}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Food picker modal */}
      <Modal visible={foodModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setFoodModal(false); setSelectedFood(null); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Meal</Text>
            <TouchableOpacity onPress={handleAddEntry} disabled={!selectedFood}>
              <Text style={[styles.modalDone, !selectedFood && { color: '#d1d5db' }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {selectedFood ? (
            <View style={[styles.card, { margin: 16 }]}>
              <Text style={styles.sectionTitle}>{selectedFood.name}</Text>
              <Text style={styles.entryMeta}>{selectedFood.caloriesPer100g} kcal / 100g</Text>
              <View style={styles.gramsRow}>
                <Text style={styles.gramsLabel}>Grams:</Text>
                <TextInput
                  style={styles.gramsInput}
                  value={grams}
                  onChangeText={setGrams}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <Text style={styles.gramsKcal}>
                  = {Math.round((parseInt(grams) || 0) / 100 * selectedFood.caloriesPer100g)} kcal
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFood(null)} style={{ marginTop: 8 }}>
                <Text style={{ color: '#10b981', fontSize: 13 }}>← Change food</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.searchInput}
                placeholder="Search foods…"
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#9ca3af"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ gap: 8, padding: 12 }}>
                {['all', ...foodCategories].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.catChip, category === c && styles.catChipActive]}
                  >
                    <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <FlatList
                data={filteredFoods}
                keyExtractor={(f) => f.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.foodRow} onPress={() => setSelectedFood(item)}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <Text style={styles.foodKcal}>{item.caloriesPer100g} kcal/100g</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
              />
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Target modal */}
      <Modal visible={targetModal} animationType="slide" transparent>
        <View style={styles.targetOverlay}>
          <View style={styles.targetSheet}>
            <Text style={styles.modalTitle}>Daily Calorie Target</Text>
            <TextInput
              style={styles.targetInput}
              value={targetInput}
              onChangeText={setTargetInput}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: '#e5e7eb' }]} onPress={() => setTargetModal(false)}>
                <Text style={{ fontWeight: '600', color: '#374151' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: '#10b981' }]} onPress={handleSaveTarget}>
                <Text style={{ fontWeight: '600', color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#9ca3af', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  summaryTotal: { fontSize: 28, fontWeight: '800' },
  targetBtn: { fontSize: 16, fontWeight: '700', color: '#374151' },
  barBg: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pctLabel: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'right' },
  addBtn: { backgroundColor: '#10b981', borderRadius: 12, padding: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  empty: { color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  entryName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  entryMeta: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  entryKcal: { fontSize: 13, fontWeight: '700', color: '#374151', marginRight: 10 },
  removeBtn: { padding: 4 },
  removeBtnText: { color: '#d1d5db', fontSize: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalCancel: { color: '#6b7280', fontSize: 15 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalDone: { color: '#10b981', fontSize: 15, fontWeight: '700' },
  searchInput: { margin: 12, marginBottom: 0, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  catScroll: { maxHeight: 56 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  catChipActive: { backgroundColor: '#10b981' },
  catChipText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff' },
  foodName: { fontSize: 14, color: '#111827' },
  foodKcal: { fontSize: 12, color: '#9ca3af' },
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  gramsLabel: { fontSize: 14, color: '#374151' },
  gramsInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 16, width: 70, textAlign: 'center' },
  gramsKcal: { fontSize: 13, color: '#10b981', fontWeight: '700' },
  targetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  targetSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  targetInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, fontSize: 24, fontWeight: '700', textAlign: 'center', paddingVertical: 10 },
  sheetBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
