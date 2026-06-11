import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  USER_PROFILE_KEY, UserProfile, ACTIVITY_OPTIONS, GOAL_OPTIONS, calcPlan,
} from '../utils/nutritionCalc';
import { useCalorieStore } from '../hooks/useCalorieStore';
import {
  BG, CARD, CARD2, BORDER, TEXT, MUTED, DIM,
  ACCENT, ACCENT_SOFT, ACCENT_MID, ACCENT_DARK, SERIF,
} from '../constants/theme';

const GOALS_KEY = 'fittrack_calorie_settings';

export default function CalorieSettingsScreen() {
  const { updateGoals } = useCalorieStore();
  const [loading, setLoading] = useState(true);

  const [sex,        setSex]      = useState<'male' | 'female'>('male');
  const [age,        setAge]      = useState('25');
  const [weight,     setWeight]   = useState('70');
  const [height,     setHeight]   = useState('175');
  const [weightUnit, setWU]       = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHU]       = useState<'cm' | 'in'>('cm');
  const [activity,   setActivity] = useState<UserProfile['activityLevel']>('moderate');
  const [goal,       setGoal]     = useState<UserProfile['goal']>('maintain');

  const [calGoal,  setCalGoal]  = useState('2000');
  const [protGoal, setProtGoal] = useState('150');
  const [carbGoal, setCarbGoal] = useState('200');
  const [fatGoal,  setFatGoal]  = useState('65');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(USER_PROFILE_KEY),
      AsyncStorage.getItem(GOALS_KEY),
    ]).then(([profileRaw, goalsRaw]) => {
      if (profileRaw) {
        const p: UserProfile = JSON.parse(profileRaw);
        setSex(p.sex); setAge(String(p.age));
        setWeight(String(Math.round(p.weightKg * 10) / 10));
        setHeight(String(Math.round(p.heightCm)));
        setActivity(p.activityLevel); setGoal(p.goal);
      }
      if (goalsRaw) {
        const g = JSON.parse(goalsRaw);
        setCalGoal(String(g.calories ?? g.dailyTarget ?? 2000));
        setProtGoal(String(g.protein ?? 150));
        setCarbGoal(String(g.carbs ?? 200));
        setFatGoal(String(g.fat ?? 65));
      } else if (profileRaw) {
        const rec = calcPlan(JSON.parse(profileRaw));
        setCalGoal(String(rec.calories)); setProtGoal(String(rec.protein));
        setCarbGoal(String(rec.carbs));   setFatGoal(String(rec.fat));
      }
      setLoading(false);
    });
  }, []);

  function resetToRecommended() {
    const weightKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) / 2.2046;
    const heightCm = heightUnit === 'cm' ? parseFloat(height) : parseFloat(height) * 2.54;
    const rec = calcPlan({ sex, goal, activityLevel: activity, age: parseInt(age) || 25, weightKg: weightKg || 70, heightCm: heightCm || 170 });
    setCalGoal(String(rec.calories)); setProtGoal(String(rec.protein));
    setCarbGoal(String(rec.carbs));   setFatGoal(String(rec.fat));
  }

  async function save() {
    const weightKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) / 2.2046;
    const heightCm = heightUnit === 'cm' ? parseFloat(height) : parseFloat(height) * 2.54;
    const profile: UserProfile = {
      sex, activityLevel: activity, goal, onboardingComplete: true,
      age:      Math.max(10, Math.min(100, parseInt(age)    || 25)),
      weightKg: Math.max(30, Math.min(300, weightKg          || 70)),
      heightCm: Math.max(100, Math.min(250, heightCm         || 170)),
    };
    const goals = {
      calories: Math.max(1200, parseInt(calGoal)  || 2000),
      protein:  Math.max(0,    parseInt(protGoal) || 150),
      carbs:    Math.max(0,    parseInt(carbGoal) || 200),
      fat:      Math.max(0,    parseInt(fatGoal)  || 65),
    };
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    updateGoals(goals);
  }

  if (loading) return <View style={s.loading}><ActivityIndicator color={ACCENT} /></View>;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Targets card */}
        <View style={s.targetsCard}>
          <Text style={s.targetsTitle}>Daily Targets</Text>
          <Text style={s.targetsSub}>Edit any value, or recalculate from profile below</Text>
          <View style={s.targetsGrid}>
            {([
              { label: 'Calories', unit: 'kcal', val: calGoal,  set: setCalGoal,  color: ACCENT      },
              { label: 'Protein',  unit: 'g',    val: protGoal, set: setProtGoal, color: ACCENT_SOFT  },
              { label: 'Carbs',    unit: 'g',    val: carbGoal, set: setCarbGoal, color: ACCENT_MID   },
              { label: 'Fat',      unit: 'g',    val: fatGoal,  set: setFatGoal,  color: ACCENT_DARK  },
            ] as const).map(({ label, unit, val, set, color }) => (
              <View key={label} style={s.targetTile}>
                <Text style={s.targetLabel}>{label}</Text>
                <TextInput
                  style={[s.targetInput, { color }]}
                  value={val}
                  onChangeText={set as (v: string) => void}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <Text style={s.targetUnit}>{unit}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={save}>
            <Text style={s.saveTxt}>Save Changes</Text>
          </TouchableOpacity>
        </View>

        {/* Profile */}
        <Text style={s.sectionLabel}>Biological Sex</Text>
        <View style={s.pillRow}>
          {(['male', 'female'] as const).map((v) => (
            <TouchableOpacity key={v} style={[s.pill, sex === v && s.pillOn]} onPress={() => setSex(v)}>
              <Text style={[s.pillTxt, sex === v && s.pillTxtOn]}>{v === 'male' ? '♂  Male' : '♀  Female'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Age</Text>
        <View style={s.fieldRow}>
          <TextInput style={s.numInput} value={age} onChangeText={setAge} keyboardType="number-pad" selectTextOnFocus />
          <Text style={s.unit}>years</Text>
        </View>

        <Text style={s.sectionLabel}>Weight</Text>
        <View style={s.fieldRow}>
          <TextInput style={s.numInput} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" selectTextOnFocus />
          <View style={s.toggle}>
            {(['kg', 'lbs'] as const).map((u) => (
              <TouchableOpacity key={u} style={[s.toggleBtn, weightUnit === u && s.toggleOn]} onPress={() => setWU(u)}>
                <Text style={[s.toggleTxt, weightUnit === u && s.toggleTxtOn]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={s.sectionLabel}>Height</Text>
        <View style={s.fieldRow}>
          <TextInput style={s.numInput} value={height} onChangeText={setHeight} keyboardType="decimal-pad" selectTextOnFocus />
          <View style={s.toggle}>
            {(['cm', 'in'] as const).map((u) => (
              <TouchableOpacity key={u} style={[s.toggleBtn, heightUnit === u && s.toggleOn]} onPress={() => setHU(u)}>
                <Text style={[s.toggleTxt, heightUnit === u && s.toggleTxtOn]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={s.sectionLabel}>Activity Level</Text>
        <View style={s.optList}>
          {ACTIVITY_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.id} style={[s.optCard, activity === opt.id && s.optCardOn]} onPress={() => setActivity(opt.id)}>
              <View style={s.radio}>{activity === opt.id && <View style={s.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optLabel, activity === opt.id && s.optLabelOn]}>{opt.label}</Text>
                <Text style={s.optDesc}>{opt.desc}</Text>
              </View>
              <Text style={s.optMult}>×{opt.multiplier}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Your Goal</Text>
        <View style={s.optList}>
          {GOAL_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.id} style={[s.optCard, goal === opt.id && s.optCardOn]} onPress={() => setGoal(opt.id)}>
              <View style={s.radio}>{goal === opt.id && <View style={s.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optLabel, goal === opt.id && s.optLabelOn]}>{opt.label}</Text>
                <Text style={s.optDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.recalcBtn} onPress={resetToRecommended}>
          <Text style={s.recalcTxt}>Recalculate Goals</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: BG },
  loading:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  scroll:        { padding: 14, gap: 0, paddingBottom: 28 },

  targetsCard:   { backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: BORDER },
  targetsTitle:  { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  targetsSub:    { fontSize: 11, color: MUTED, marginTop: -4 },
  targetsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetTile:    { width: '47%', backgroundColor: BG, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: BORDER },
  targetLabel:   { fontSize: 9, color: MUTED, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  targetInput:   { fontSize: 22, fontWeight: '900', textAlign: 'center', width: '100%', paddingVertical: 2, fontFamily: SERIF },
  targetUnit:    { fontSize: 9, color: DIM },

  sectionLabel:  { fontSize: 10, fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.9, marginTop: 14, marginBottom: 5 },

  pillRow:       { flexDirection: 'row', gap: 8 },
  pill:          { flex: 1, backgroundColor: CARD, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, borderColor: BORDER },
  pillOn:        { backgroundColor: TEXT, borderColor: TEXT },
  pillTxt:       { fontSize: 14, fontWeight: '700', color: MUTED },
  pillTxtOn:     { color: BG },

  fieldRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numInput:      { backgroundColor: CARD, color: TEXT, fontSize: 18, fontWeight: '800', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10, width: 90, textAlign: 'center', borderWidth: 1, borderColor: BORDER, fontFamily: SERIF },
  unit:          { fontSize: 13, color: MUTED },
  toggle:        { flexDirection: 'row', gap: 5 },
  toggleBtn:     { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 7, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  toggleOn:      { backgroundColor: TEXT, borderColor: TEXT },
  toggleTxt:     { fontSize: 12, fontWeight: '600', color: MUTED },
  toggleTxtOn:   { color: BG },

  optList:       { gap: 5 },
  optCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 10, padding: 10, gap: 10, borderWidth: 1.5, borderColor: 'transparent' },
  optCardOn:     { borderColor: ACCENT },
  radio:         { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  radioDot:      { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ACCENT },
  optLabel:      { fontSize: 13, fontWeight: '700', color: MUTED },
  optLabelOn:    { color: TEXT },
  optDesc:       { fontSize: 11, color: DIM, marginTop: 1 },
  optMult:       { fontSize: 11, color: BORDER, fontWeight: '700' },

  recalcBtn:     { marginTop: 14, backgroundColor: BG, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: ACCENT },
  recalcTxt:     { color: ACCENT, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  saveBtn:       { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveTxt:       { color: BG, fontSize: 14, fontWeight: '800' },
});
