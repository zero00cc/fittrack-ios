import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  USER_PROFILE_KEY, UserProfile, ACTIVITY_OPTIONS, GOAL_OPTIONS, calcPlan,
} from '../utils/nutritionCalc';
import { useCalorieStore } from '../hooks/useCalorieStore';

export default function CalorieSettingsScreen() {
  const { updateGoals } = useCalorieStore();

  const [loading, setLoading]   = useState(true);
  const [sex, setSex]           = useState<'male' | 'female'>('male');
  const [age, setAge]           = useState('25');
  const [weight, setWeight]     = useState('70');
  const [height, setHeight]     = useState('175');
  const [weightUnit, setWU]     = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHU]     = useState<'cm' | 'in'>('cm');
  const [activity, setActivity] = useState<UserProfile['activityLevel']>('moderate');
  const [goal, setGoal]         = useState<UserProfile['goal']>('maintain');

  useEffect(() => {
    AsyncStorage.getItem(USER_PROFILE_KEY).then((raw) => {
      if (raw) {
        const p: UserProfile = JSON.parse(raw);
        setSex(p.sex);
        setAge(String(p.age));
        setWeight(String(Math.round(p.weightKg * 10) / 10));
        setHeight(String(Math.round(p.heightCm)));
        setActivity(p.activityLevel);
        setGoal(p.goal);
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    const weightKg = weightUnit === 'kg' ? parseFloat(weight) : parseFloat(weight) / 2.2046;
    const heightCm = heightUnit === 'cm' ? parseFloat(height) : parseFloat(height) * 2.54;

    const profile: UserProfile = {
      sex,
      age:           Math.max(10, Math.min(100, parseInt(age) || 25)),
      weightKg:      Math.max(30, Math.min(300, weightKg || 70)),
      heightCm:      Math.max(100, Math.min(250, heightCm || 170)),
      activityLevel: activity,
      goal,
      onboardingComplete: true,
    };

    const newGoals = calcPlan(profile);
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    updateGoals(newGoals);
    router.back();
  }

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Sex */}
        <Text style={s.sectionLabel}>Biological Sex</Text>
        <View style={s.pillRow}>
          {(['male', 'female'] as const).map((v) => (
            <TouchableOpacity key={v} style={[s.pill, sex === v && s.pillOn]} onPress={() => setSex(v)}>
              <Text style={[s.pillTxt, sex === v && s.pillTxtOn]}>
                {v === 'male' ? '♂  Male' : '♀  Female'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Age */}
        <Text style={s.sectionLabel}>Age</Text>
        <View style={s.fieldRow}>
          <TextInput style={s.numInput} value={age} onChangeText={setAge} keyboardType="number-pad" selectTextOnFocus />
          <Text style={s.unit}>years</Text>
        </View>

        {/* Weight */}
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

        {/* Height */}
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

        {/* Activity level */}
        <Text style={s.sectionLabel}>Activity Level</Text>
        <View style={s.optList}>
          {ACTIVITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[s.optCard, activity === opt.id && s.optCardOn]}
              onPress={() => setActivity(opt.id)}
            >
              <View style={s.radio}>{activity === opt.id && <View style={s.radioDot} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optLabel, activity === opt.id && s.optLabelOn]}>{opt.label}</Text>
                <Text style={s.optDesc}>{opt.desc}</Text>
              </View>
              <Text style={s.optMult}>×{opt.multiplier}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal */}
        <Text style={s.sectionLabel}>Your Goal</Text>
        <View style={s.optList}>
          {GOAL_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[s.optCard, goal === opt.id && s.optCardOn]}
              onPress={() => setGoal(opt.id)}
            >
              <View style={s.radio}>{goal === opt.id && <View style={s.radioDot} />}</View>
              <Text style={s.optEmoji}>{opt.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.optLabel, goal === opt.id && s.optLabelOn]}>{opt.label}</Text>
                <Text style={s.optDesc}>{opt.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Text style={s.saveTxt}>Save & Recalculate Goals</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#111827' },
  loading:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  scroll:       { padding: 16, gap: 6, paddingBottom: 24 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 14, marginBottom: 6 },

  pillRow:      { flexDirection: 'row', gap: 10 },
  pill:         { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#334155' },
  pillOn:       { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillTxt:      { fontSize: 15, fontWeight: '700', color: '#64748b' },
  pillTxtOn:    { color: '#fff' },

  fieldRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numInput:     { backgroundColor: '#1e293b', color: '#f1f5f9', fontSize: 20, fontWeight: '800', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, width: 100, textAlign: 'center' },
  unit:         { fontSize: 14, color: '#64748b' },
  toggle:       { flexDirection: 'row', gap: 6 },
  toggleBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1e293b' },
  toggleOn:     { backgroundColor: '#10b981' },
  toggleTxt:    { fontSize: 13, fontWeight: '600', color: '#64748b' },
  toggleTxtOn:  { color: '#fff' },

  optList:      { gap: 6 },
  optCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, gap: 10, borderWidth: 1.5, borderColor: 'transparent' },
  optCardOn:    { borderColor: '#10b981' },
  radio:        { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  radioDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  optEmoji:     { fontSize: 18 },
  optLabel:     { fontSize: 13, fontWeight: '700', color: '#64748b' },
  optLabelOn:   { color: '#f1f5f9' },
  optDesc:      { fontSize: 11, color: '#475569', marginTop: 1 },
  optMult:      { fontSize: 11, color: '#334155', fontWeight: '700' },

  footer:       { padding: 16, paddingBottom: 24 },
  saveBtn:      { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },
});
