/**
 * Calorie onboarding — shown once on first use.
 * BMR: Mifflin-St Jeor (1990). TDEE: BMR × Ainsworth activity multiplier.
 */

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  USER_PROFILE_KEY, UserProfile, ACTIVITY_OPTIONS, GOAL_OPTIONS, calcPlan,
} from '../utils/nutritionCalc';
import { CalorieGoals } from '../types/calorie.types';
import {
  BG, CARD, CARD2, BORDER, TEXT, MUTED, DIM,
  ACCENT, ACCENT_SOFT, ACCENT_MID, ACCENT_DARK, SERIF,
} from '../constants/theme';

// ── Numeric field ─────────────────────────────────────────────────────────────

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
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label:     { fontSize: 15, color: TEXT, fontWeight: '600' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input:     { backgroundColor: CARD, color: TEXT, fontSize: 18, fontWeight: '700', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10, width: 90, textAlign: 'center', borderWidth: 1, borderColor: BORDER, fontFamily: SERIF },
  unit:      { fontSize: 13, color: MUTED, width: 32 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

export default function CalorieOnboardingScreen() {
  const [step, setStep]         = useState(0);
  const [sex,  setSex]          = useState<'male' | 'female'>('male');
  const [age,    setAge]        = useState('25');
  const [weight, setWeight]     = useState('70');
  const [height, setHeight]     = useState('175');
  const [weightUnit, setWU]     = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHU]     = useState<'cm' | 'in'>('cm');
  const [activity, setActivity] = useState<UserProfile['activityLevel']>('moderate');
  const [goal,     setGoal]     = useState<UserProfile['goal']>('maintain');

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
    const profile  = buildProfile();
    const goals    = customGoals ?? calcPlan(profile);
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify({ ...profile, onboardingComplete: true }));
    await AsyncStorage.setItem('fittrack_calorie_settings', JSON.stringify(goals));
    router.replace('/(tabs)/calories');
  }

  function canContinue() {
    if (step === 1) {
      const a = parseInt(age); const w = parseFloat(weight); const h = parseFloat(height);
      return a > 0 && w > 0 && h > 0;
    }
    return true;
  }

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Welcome to FitTrack</Text>
            <Text style={s.stepSub}>
              Let's build a calorie plan personalised to your body.{'\n'}
              We'll use the Mifflin-St Jeor equation — the gold standard for metabolic rate estimation.
            </Text>
            <Text style={s.fieldLabel}>Biological sex</Text>
            <Text style={s.fieldNote}>Used to calculate your basal metabolic rate accurately.</Text>
            <View style={s.pillRow}>
              {(['male', 'female'] as const).map((v) => (
                <TouchableOpacity key={v} style={[s.pill, sex === v && s.pillActive]} onPress={() => setSex(v)}>
                  <Text style={[s.pillTxt, sex === v && s.pillTxtActive]}>{v === 'male' ? '♂ Male' : '♀ Female'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Your Measurements</Text>
            <Text style={s.stepSub}>Used to calculate BMR and TDEE. Updatable any time in settings.</Text>
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
              <Text style={s.stepSub}>Activity sets your TDEE. Goal applies a clinically-backed calorie adjustment.</Text>

              <Text style={s.sectionLabel}>Activity Level</Text>
              {ACTIVITY_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s.optCard, activity === opt.id && s.optCardActive]} onPress={() => setActivity(opt.id)}>
                  <View style={s.optRadio}>{activity === opt.id && <View style={s.optRadioDot} />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optLabel, activity === opt.id && s.optLabelActive]}>{opt.label}</Text>
                    <Text style={s.optDesc}>{opt.desc}</Text>
                  </View>
                  <Text style={s.optMult}>×{opt.multiplier}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[s.sectionLabel, { marginTop: 20 }]}>Your Goal</Text>
              {GOAL_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.id} style={[s.optCard, goal === opt.id && s.optCardActive]} onPress={() => setGoal(opt.id)}>
                  <View style={s.optRadio}>{goal === opt.id && <View style={s.optRadioDot} />}</View>
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
              <Text style={s.stepSub}>Calculated using Mifflin-St Jeor BMR × activity, adjusted for your goal.</Text>

              <View style={s.calcCard}>
                <Text style={s.calcTitle}>How we got here</Text>
                <View style={s.calcRow}><Text style={s.calcKey}>BMR</Text><Text style={s.calcVal}>{bmr.toLocaleString()} kcal</Text></View>
                <View style={s.calcRow}><Text style={s.calcKey}>× Activity ({ACTIVITY_OPTIONS.find(a => a.id === activity)?.label})</Text><Text style={s.calcVal}>{tdee.toLocaleString()} kcal</Text></View>
                <View style={[s.calcRow, s.calcRowLast]}>
                  <Text style={s.calcKey}>{goalObj.label}</Text>
                  <Text style={[s.calcVal, { color: ACCENT }]}>{plan.calories.toLocaleString()} kcal</Text>
                </View>
              </View>

              <Text style={s.sectionLabel}>Daily Targets</Text>
              <View style={s.macroGrid}>
                {[
                  { label: 'Calories', val: plan.calories, unit: 'kcal', color: ACCENT      },
                  { label: 'Protein',  val: plan.protein,  unit: 'g',    color: ACCENT_SOFT  },
                  { label: 'Carbs',    val: plan.carbs,    unit: 'g',    color: ACCENT_MID   },
                  { label: 'Fat',      val: plan.fat,      unit: 'g',    color: ACCENT_DARK  },
                ].map(({ label, val, unit, color }) => (
                  <View key={label} style={s.macroTile}>
                    <Text style={[s.macroVal, { color, fontFamily: SERIF }]}>{val}</Text>
                    <Text style={s.macroUnit}>{unit}</Text>
                    <Text style={s.macroLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.disclaimer}>
                These are evidence-based starting points. Adjust your goals any time from the settings menu.
              </Text>
            </View>
          </ScrollView>
        );
      }
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
      </View>

      <View style={{ flex: 1 }}>{renderStep()}</View>

      <View style={s.footer}>
        {step > 0 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setStep(step - 1)}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity style={[s.nextBtn, !canContinue() && s.nextBtnOff]} onPress={() => canContinue() && setStep(step + 1)}>
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
  safe:          { flex: 1, backgroundColor: BG },

  progressTrack: { height: 3, backgroundColor: BORDER },
  progressFill:  { height: 3, backgroundColor: ACCENT, borderRadius: 2 },

  stepWrap:      { padding: 24, gap: 12 },
  stepTitle:     { fontSize: 26, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  stepSub:       { fontSize: 13, color: MUTED, lineHeight: 20 },
  fieldLabel:    { fontSize: 16, fontWeight: '700', color: TEXT, marginTop: 8 },
  fieldNote:     { fontSize: 12, color: DIM, marginTop: -8 },

  pillRow:       { flexDirection: 'row', gap: 12, marginTop: 4 },
  pill:          { flex: 1, backgroundColor: CARD, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: BORDER },
  pillActive:    { backgroundColor: TEXT, borderColor: TEXT },
  pillTxt:       { fontSize: 16, fontWeight: '700', color: MUTED },
  pillTxtActive: { color: BG },

  unitRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unitToggle:    { flexDirection: 'row', gap: 4 },
  unitBtn:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  unitBtnActive: { backgroundColor: TEXT, borderColor: TEXT },
  unitBtnTxt:    { fontSize: 12, color: MUTED, fontWeight: '600' },
  unitBtnTxtActive: { color: BG },

  sectionLabel:  { fontSize: 12, fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.8 },

  optCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, gap: 12, marginVertical: 4, borderWidth: 1.5, borderColor: 'transparent' },
  optCardActive: { borderColor: ACCENT },
  optRadio:      { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  optRadioDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },
  optLabel:      { fontSize: 14, fontWeight: '700', color: MUTED },
  optLabelActive:{ color: TEXT },
  optDesc:       { fontSize: 11, color: DIM, marginTop: 2 },
  optMult:       { fontSize: 12, color: BORDER, fontWeight: '700' },

  calcCard:      { backgroundColor: CARD, borderRadius: 12, padding: 16, gap: 2, borderWidth: 1, borderColor: BORDER },
  calcTitle:     { fontSize: 12, color: MUTED, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  calcRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  calcRowLast:   { borderBottomWidth: 0, marginTop: 4 },
  calcKey:       { fontSize: 13, color: MUTED },
  calcVal:       { fontSize: 13, fontWeight: '700', color: TEXT },

  macroGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroTile:     { width: '47%', backgroundColor: CARD, borderRadius: 12, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: BORDER },
  macroVal:      { fontSize: 26, fontWeight: '900' },
  macroUnit:     { fontSize: 11, color: DIM },
  macroLabel:    { fontSize: 11, color: MUTED, fontWeight: '600', textTransform: 'uppercase' },

  disclaimer:    { fontSize: 11, color: DIM, lineHeight: 17, marginTop: 8 },

  footer:        { flexDirection: 'row', padding: 16, paddingBottom: 24, gap: 12 },
  backBtn:       { flex: 1, backgroundColor: CARD, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  backTxt:       { color: MUTED, fontWeight: '700', fontSize: 15 },
  nextBtn:       { flex: 2, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  nextBtnOff:    { backgroundColor: CARD },
  nextTxt:       { color: '#0A0803', fontWeight: '800', fontSize: 16 },
});
