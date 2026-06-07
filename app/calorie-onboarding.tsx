/**
 * Calorie onboarding — shown once on first use, accessible again via ⚙️ in the main screen.
 *
 * BMR: Mifflin-St Jeor equation (1990) — most validated for general adults.
 *   Men:   10W + 6.25H − 5A + 5
 *   Women: 10W + 6.25H − 5A − 161
 *   (W = kg, H = cm, A = years)
 *
 * TDEE: BMR × activity multiplier (Ainsworth et al., 2011 compendium).
 *   Sedentary 1.2 · Light 1.375 · Moderate 1.55 · Very 1.725 · Extra 1.9
 *
 * Goal adjustments (standard clinical deficit/surplus):
 *   Lose weight  −500 kcal/day  (~0.5 kg/week, safe long-term)
 *   Maintain      0
 *   Build muscle +250 kcal/day  (lean bulk, minimises fat gain)
 *   Gain weight  +500 kcal/day  (~0.5 kg/week lean mass gain)
 *
 * Protein targets (ISSN 2017 guidelines):
 *   Cut: 2.2 g/kg  |  Maintain: 1.6 g/kg  |  Bulk: 2.0 g/kg
 * Fat: 25–30% of calories (minimum for hormonal health)
 * Carbs: remainder
 */

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet, SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { CalorieGoals } from '../types/calorie.types';

export const USER_PROFILE_KEY = 'fittrack_user_profile';

export interface UserProfile {
  sex:           'male' | 'female';
  age:           number;
  weightKg:      number;
  heightCm:      number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
  goal:          'lose' | 'maintain' | 'build' | 'gain';
  onboardingComplete: boolean;
}

const ACTIVITY_OPTIONS: { id: UserProfile['activityLevel']; label: string; desc: string; multiplier: number }[] = [
  { id: 'sedentary', label: 'Sedentary',         desc: 'Desk job, little or no exercise',          multiplier: 1.2   },
  { id: 'light',     label: 'Lightly Active',     desc: 'Light exercise 1–3 days/week',             multiplier: 1.375 },
  { id: 'moderate',  label: 'Moderately Active',  desc: 'Moderate exercise 3–5 days/week',          multiplier: 1.55  },
  { id: 'very',      label: 'Very Active',         desc: 'Hard exercise 6–7 days/week',              multiplier: 1.725 },
  { id: 'extra',     label: 'Extra Active',        desc: 'Very hard exercise + physical job',        multiplier: 1.9   },
];

const GOAL_OPTIONS: { id: UserProfile['goal']; label: string; desc: string; adj: number; emoji: string }[] = [
  { id: 'lose',      label: 'Lose Weight',    desc: '−500 kcal/day · ~0.5 kg/week loss',      adj: -500, emoji: '📉' },
  { id: 'maintain',  label: 'Maintain',       desc: 'Eat at your TDEE · sustain current weight', adj: 0,  emoji: '⚖️' },
  { id: 'build',     label: 'Build Muscle',   desc: '+250 kcal/day · lean bulk',              adj: 250,  emoji: '💪' },
  { id: 'gain',      label: 'Gain Weight',    desc: '+500 kcal/day · ~0.5 kg/week gain',      adj: 500,  emoji: '📈' },
];

function calcPlan(profile: Omit<UserProfile, 'onboardingComplete'>): CalorieGoals {
  const { sex, age, weightKg, heightCm, activityLevel, goal } = profile;

  // Mifflin-St Jeor BMR
  const bmr  = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const mult = ACTIVITY_OPTIONS.find((a) => a.id === activityLevel)?.multiplier ?? 1.55;
  const tdee = bmr * mult;

  const adj      = GOAL_OPTIONS.find((g) => g.id === goal)?.adj ?? 0;
  const calories = Math.max(1200, Math.round(tdee + adj));

  // Protein per kg bodyweight (ISSN 2017)
  const proteinPerKg = { lose: 2.2, maintain: 1.6, build: 2.0, gain: 2.0 } as const;
  const protein      = Math.round(proteinPerKg[goal] * weightKg);

  // Fat: 25–30% of calories (for hormonal health)
  const fatPct = { lose: 0.25, maintain: 0.25, build: 0.28, gain: 0.30 } as const;
  const fat    = Math.round((calories * fatPct[goal]) / 9);

  // Carbs: remainder (minimum 50g floor)
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat };
}

// ── Shared field components ───────────────────────────────────────────────────

function NumField({ label, value, unit, onChange }: {
  label: string; value: string; unit: string; onChange: (v: string) => void;
}) {
  return (
    <View style={f.row}>
      <Text style={f.label}>{label}</Text>
      <View style={f.inputWrap}>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <Text style={f.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label:    { fontSize: 15, color: '#f1f5f9', fontWeight: '600' },
  inputWrap:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  input:    { backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 18, fontWeight: '700', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, width: 90, textAlign: 'center' },
  unit:     { fontSize: 13, color: '#64748b', width: 32 },
});

// ── Main onboarding screen ────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

export default function CalorieOnboardingScreen() {
  const [step, setStep]       = useState(0);

  // Step 0 — sex
  const [sex, setSex]         = useState<'male' | 'female'>('male');

  // Step 1 — measurements
  const [age,    setAge]      = useState('25');
  const [weight, setWeight]   = useState('70');
  const [height, setHeight]   = useState('175');
  const [weightUnit, setWU]   = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHU]   = useState<'cm' | 'in'>('cm');

  // Step 2 — activity + goal
  const [activity, setActivity] = useState<UserProfile['activityLevel']>('moderate');
  const [goal,     setGoal]     = useState<UserProfile['goal']>('maintain');

  // Derived profile (used from step 3 onward)
  function buildProfile(): Omit<UserProfile, 'onboardingComplete'> {
    const weightKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) / 2.2046;
    const heightCm = heightUnit === 'cm' ? parseFloat(height) : parseFloat(height) * 2.54;
    return {
      sex,
      age:      Math.max(10, Math.min(100, parseInt(age) || 25)),
      weightKg: Math.max(30, Math.min(300, weightKg || 70)),
      heightCm: Math.max(100, Math.min(250, heightCm || 170)),
      activityLevel: activity,
      goal,
    };
  }

  async function finish(customGoals?: CalorieGoals) {
    const profile = buildProfile();
    const goals   = customGoals ?? calcPlan(profile);

    // Save profile
    const fullProfile: UserProfile = { ...profile, onboardingComplete: true };
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(fullProfile));

    // Save goals (same key as useCalorieStore reads)
    await AsyncStorage.setItem('fittrack_calorie_settings', JSON.stringify(goals));

    router.replace('/(tabs)/calories');
  }

  function canContinue(): boolean {
    if (step === 1) {
      const a = parseInt(age); const w = parseFloat(weight); const h = parseFloat(height);
      return a > 0 && w > 0 && h > 0;
    }
    return true;
  }

  // ── Progress bar ─────────────────────────────────────────────────────────────

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  // ── Render steps ─────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Welcome to FitTrack</Text>
            <Text style={s.stepSub}>
              Let's build a calorie plan personalised to your body.{'\n'}
              We'll calculate your BMR using the Mifflin-St Jeor equation — the gold standard for metabolic rate estimation.
            </Text>
            <Text style={s.fieldLabel}>Biological sex</Text>
            <Text style={s.fieldNote}>Used to calculate your basal metabolic rate accurately.</Text>
            <View style={s.pillRow}>
              {(['male', 'female'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[s.pill, sex === v && s.pillActive]}
                  onPress={() => setSex(v)}
                >
                  <Text style={[s.pillTxt, sex === v && s.pillTxtActive]}>
                    {v === 'male' ? '♂ Male' : '♀ Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Your Measurements</Text>
            <Text style={s.stepSub}>These are used to calculate your BMR and TDEE. You can update them any time.</Text>
            <NumField label="Age" value={age} unit="yrs" onChange={setAge} />
            <View style={s.unitRow}>
              <NumField label="Weight" value={weight} unit="" onChange={setWeight} />
              <View style={s.unitToggle}>
                {(['kg', 'lbs'] as const).map((u) => (
                  <TouchableOpacity key={u} style={[s.unitBtn, weightUnit === u && s.unitBtnActive]} onPress={() => setWU(u)}>
                    <Text style={[s.unitBtnTxt, weightUnit === u && s.unitBtnTxtActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.unitRow}>
              <NumField label="Height" value={height} unit="" onChange={setHeight} />
              <View style={s.unitToggle}>
                {(['cm', 'in'] as const).map((u) => (
                  <TouchableOpacity key={u} style={[s.unitBtn, heightUnit === u && s.unitBtnActive]} onPress={() => setHU(u)}>
                    <Text style={[s.unitBtnTxt, heightUnit === u && s.unitBtnTxtActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>Activity & Goal</Text>
              <Text style={s.stepSub}>Your activity level sets your TDEE. Your goal applies a research-backed calorie adjustment on top.</Text>

              <Text style={s.sectionLabel}>Activity Level</Text>
              {ACTIVITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.optCard, activity === opt.id && s.optCardActive]}
                  onPress={() => setActivity(opt.id)}
                >
                  <View style={s.optRadio}>
                    {activity === opt.id && <View style={s.optRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optLabel, activity === opt.id && s.optLabelActive]}>{opt.label}</Text>
                    <Text style={s.optDesc}>{opt.desc}</Text>
                  </View>
                  <Text style={s.optMult}>×{opt.multiplier}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[s.sectionLabel, { marginTop: 20 }]}>Your Goal</Text>
              {GOAL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.optCard, goal === opt.id && s.optCardActive]}
                  onPress={() => setGoal(opt.id)}
                >
                  <View style={s.optRadio}>
                    {goal === opt.id && <View style={s.optRadioDot} />}
                  </View>
                  <Text style={s.optEmoji}>{opt.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optLabel, goal === opt.id && s.optLabelActive]}>{opt.label}</Text>
                    <Text style={s.optDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 3: {
        const profile = buildProfile();
        const plan    = calcPlan(profile);
        const mult    = ACTIVITY_OPTIONS.find((a) => a.id === profile.activityLevel)!.multiplier;
        const bmr     = Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + (profile.sex === 'male' ? 5 : -161));
        const tdee    = Math.round(bmr * mult);
        const goalObj = GOAL_OPTIONS.find((g) => g.id === goal)!;

        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>Your Personalised Plan</Text>
              <Text style={s.stepSub}>Calculated using Mifflin-St Jeor BMR × activity, then adjusted for your goal.</Text>

              {/* Calculation breakdown */}
              <View style={s.calcCard}>
                <Text style={s.calcTitle}>How we got here</Text>
                <View style={s.calcRow}><Text style={s.calcKey}>BMR</Text><Text style={s.calcVal}>{bmr.toLocaleString()} kcal</Text></View>
                <View style={s.calcRow}><Text style={s.calcKey}>× Activity ({ACTIVITY_OPTIONS.find(a=>a.id===activity)?.label})</Text><Text style={s.calcVal}>{tdee.toLocaleString()} kcal</Text></View>
                <View style={[s.calcRow, s.calcRowLast]}>
                  <Text style={s.calcKey}>{goalObj.emoji} Goal ({goalObj.label})</Text>
                  <Text style={[s.calcVal, { color: '#10b981' }]}>{plan.calories.toLocaleString()} kcal</Text>
                </View>
              </View>

              {/* Macro targets */}
              <Text style={s.sectionLabel}>Daily Targets</Text>
              <View style={s.macroGrid}>
                {[
                  { emoji: '🔥', label: 'Calories', val: plan.calories, unit: 'kcal', color: '#10b981' },
                  { emoji: '🥩', label: 'Protein',  val: plan.protein,  unit: 'g',    color: '#a78bfa' },
                  { emoji: '🌾', label: 'Carbs',    val: plan.carbs,    unit: 'g',    color: '#f59e0b' },
                  { emoji: '🥑', label: 'Fat',      val: plan.fat,      unit: 'g',    color: '#f87171' },
                ].map(({ emoji, label, val, unit, color }) => (
                  <View key={label} style={s.macroTile}>
                    <Text style={s.macroEmoji}>{emoji}</Text>
                    <Text style={[s.macroVal, { color }]}>{val}</Text>
                    <Text style={s.macroUnit}>{unit}</Text>
                    <Text style={s.macroLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.disclaimer}>
                These are evidence-based starting points. Adjust your goals any time from the ⚙️ menu after results come in.
              </Text>
            </View>
          </ScrollView>
        );
      }
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
      </View>

      <View style={{ flex: 1 }}>
        {renderStep()}
      </View>

      {/* Footer buttons */}
      <View style={s.footer}>
        {step > 0 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            style={[s.nextBtn, !canContinue() && s.nextBtnOff]}
            onPress={() => canContinue() && setStep(step + 1)}
          >
            <Text style={s.nextTxt}>Continue →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.nextBtn} onPress={() => finish()}>
            <Text style={s.nextTxt}>Start Tracking →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#111827' },

  progressTrack:{ height: 3, backgroundColor: '#1e293b' },
  progressFill: { height: 3, backgroundColor: '#10b981', borderRadius: 2 },

  stepWrap:     { padding: 24, gap: 12 },
  stepTitle:    { fontSize: 26, fontWeight: '900', color: '#f1f5f9' },
  stepSub:      { fontSize: 13, color: '#64748b', lineHeight: 20 },
  fieldLabel:   { fontSize: 16, fontWeight: '700', color: '#f1f5f9', marginTop: 8 },
  fieldNote:    { fontSize: 12, color: '#475569', marginTop: -8 },

  pillRow:      { flexDirection: 'row', gap: 12, marginTop: 4 },
  pill:         { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#334155' },
  pillActive:   { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillTxt:      { fontSize: 16, fontWeight: '700', color: '#64748b' },
  pillTxtActive:{ color: '#fff' },

  unitRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unitToggle:   { flexDirection: 'row', gap: 4 },
  unitBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1e293b' },
  unitBtnActive:{ backgroundColor: '#10b981' },
  unitBtnTxt:   { fontSize: 12, color: '#64748b', fontWeight: '600' },
  unitBtnTxtActive: { color: '#fff' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.8 },

  optCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, padding: 14, gap: 12, marginVertical: 4, borderWidth: 1.5, borderColor: 'transparent' },
  optCardActive: { borderColor: '#10b981' },
  optRadio:      { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  optRadioDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  optEmoji:      { fontSize: 20 },
  optLabel:      { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  optLabelActive:{ color: '#f1f5f9' },
  optDesc:       { fontSize: 11, color: '#475569', marginTop: 2 },
  optMult:       { fontSize: 12, color: '#334155', fontWeight: '700' },

  calcCard:      { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, gap: 2 },
  calcTitle:     { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  calcRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  calcRowLast:   { borderBottomWidth: 0, marginTop: 4 },
  calcKey:       { fontSize: 13, color: '#64748b' },
  calcVal:       { fontSize: 13, fontWeight: '700', color: '#f1f5f9' },

  macroGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroTile:     { width: '47%', backgroundColor: '#1e293b', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4 },
  macroEmoji:    { fontSize: 24 },
  macroVal:      { fontSize: 26, fontWeight: '900' },
  macroUnit:     { fontSize: 11, color: '#475569' },
  macroLabel:    { fontSize: 11, color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },

  disclaimer:    { fontSize: 11, color: '#334155', lineHeight: 17, marginTop: 8 },

  footer:        { flexDirection: 'row', padding: 16, paddingBottom: 24, gap: 12 },
  backBtn:       { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  backTxt:       { color: '#64748b', fontWeight: '700', fontSize: 15 },
  nextBtn:       { flex: 2, backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextBtnOff:    { backgroundColor: '#1e293b' },
  nextTxt:       { color: '#fff', fontWeight: '800', fontSize: 16 },
});
