import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWorkoutStore } from '../../hooks/useWorkoutStore';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useAuth } from '../../context/AuthContext';
import { Gender, classesForGender, getWeightClass } from '../../types/ranking.types';

type Screen = 'leaderboard' | 'form';

export default function RankingScreen() {
  const { user } = useAuth();
  const { workoutState } = useWorkoutStore();
  const {
    myProfile, profileLoaded,
    leaderboard, boardLoading,
    upsertProfile, fetchLeaderboard,
  } = useLeaderboard();

  const isUnlocked = (workoutState.planHistory ?? []).length > 0;

  // ── Form state ───────────────────────────────────────────────────
  const [screen,      setScreen]      = useState<Screen>('leaderboard');
  const [name,        setName]        = useState('');
  const [gender,      setGender]      = useState<Gender>('male');
  const [bodyMass,    setBodyMass]    = useState('');
  const [squat,       setSquat]       = useState('');
  const [bench,       setBench]       = useState('');
  const [deadlift,    setDeadlift]    = useState('');
  const [formError,   setFormError]   = useState('');
  const [saving,      setSaving]      = useState(false);

  // ── Filter state (leaderboard view) ─────────────────────────────
  const [filterGender, setFilterGender] = useState<Gender>('male');
  const [filterClass,  setFilterClass]  = useState('83kg');

  // Populate form from existing profile
  useEffect(() => {
    if (myProfile) {
      setName(myProfile.displayName);
      setGender(myProfile.gender);
      setBodyMass(String(myProfile.bodyMass));
      setSquat(String(myProfile.squat));
      setBench(String(myProfile.bench));
      setDeadlift(String(myProfile.deadlift));
      setFilterGender(myProfile.gender);
      setFilterClass(myProfile.weightClass);
    }
  }, [myProfile]);

  // Load leaderboard whenever filter or screen changes
  useEffect(() => {
    if (screen === 'leaderboard') {
      fetchLeaderboard(filterClass, filterGender);
    }
  }, [filterClass, filterGender, screen]);

  // ── Locked state ─────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Home</Text>
        </TouchableOpacity>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>Ranking Locked</Text>
          <Text style={styles.lockedDesc}>
            Complete at least one workout plan to unlock the global leaderboard.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Profile form ──────────────────────────────────────────────────
  if (screen === 'form' || (profileLoaded && !myProfile)) {
    async function handleSave() {
      const bm = parseFloat(bodyMass);
      const sq = parseFloat(squat);
      const bn = parseFloat(bench);
      const dl = parseFloat(deadlift);
      if (!name.trim())               return setFormError('Display name is required.');
      if (!bm || bm <= 0)             return setFormError('Enter a valid body mass.');
      if (!sq || sq <= 0)             return setFormError('Enter a valid squat PR.');
      if (!bn || bn <= 0)             return setFormError('Enter a valid bench PR.');
      if (!dl || dl <= 0)             return setFormError('Enter a valid deadlift PR.');
      setFormError('');
      setSaving(true);
      const err = await upsertProfile(name.trim(), gender, bm, sq, bn, dl);
      setSaving(false);
      if (err) { setFormError(err); return; }
      setFilterGender(gender);
      setFilterClass(getWeightClass(bm, gender));
      setScreen('leaderboard');
    }

    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {myProfile && (
            <TouchableOpacity onPress={() => setScreen('leaderboard')} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.pageTitle}>{myProfile ? 'Edit My Stats' : 'Set Up Your Profile'}</Text>
          <Text style={styles.pageSubtitle}>
            Enter your lifts in kilograms. You'll be ranked within your IPF weight class.
          </Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={user?.email?.split('@')[0] ?? 'Athlete'}
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.toggle}>
              {(['male', 'female'] as Gender[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.toggleBtn, gender === g && styles.toggleBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.toggleBtnText, gender === g && styles.toggleBtnTextActive]}>
                    {g === 'male' ? 'Male' : 'Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Body Mass (kg)</Text>
            <TextInput
              style={styles.input}
              value={bodyMass}
              onChangeText={setBodyMass}
              placeholder="e.g. 82.5"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
            />
            {bodyMass && parseFloat(bodyMass) > 0 && (
              <Text style={styles.weightClassHint}>
                Weight class: {getWeightClass(parseFloat(bodyMass), gender)}
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Records (kg)</Text>
            {[
              { label: 'Squat', value: squat, set: setSquat },
              { label: 'Bench Press', value: bench, set: setBench },
              { label: 'Deadlift', value: deadlift, set: setDeadlift },
            ].map(({ label, value, set }) => (
              <View key={label} style={styles.liftRow}>
                <Text style={styles.liftLabel}>{label}</Text>
                <TextInput
                  style={styles.liftInput}
                  value={value}
                  onChangeText={set}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.liftUnit}>kg</Text>
              </View>
            ))}
            {squat && bench && deadlift && (
              <Text style={styles.totalPreview}>
                Total: {(parseFloat(squat) || 0) + (parseFloat(bench) || 0) + (parseFloat(deadlift) || 0)} kg
              </Text>
            )}
          </View>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save & View Ranking</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Leaderboard view ─────────────────────────────────────────────
  const myRank = myProfile
    ? leaderboard.findIndex((e) => e.userId === myProfile.userId) + 1
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Leaderboard</Text>

        {/* My stats card */}
        {myProfile && (
          <View style={styles.myCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.myName}>{myProfile.displayName}</Text>
              <Text style={styles.myClass}>{myProfile.weightClass} · {myProfile.gender === 'male' ? 'Male' : 'Female'}</Text>
              <View style={styles.myLifts}>
                {[['S', myProfile.squat], ['B', myProfile.bench], ['D', myProfile.deadlift]].map(([l, v]) => (
                  <View key={l as string} style={styles.myLift}>
                    <Text style={styles.myLiftVal}>{v}</Text>
                    <Text style={styles.myLiftLabel}>{l}</Text>
                  </View>
                ))}
                <View style={[styles.myLift, styles.myLiftTotal]}>
                  <Text style={[styles.myLiftVal, styles.myLiftTotalVal]}>{myProfile.total}</Text>
                  <Text style={styles.myLiftLabel}>Total</Text>
                </View>
              </View>
            </View>
            <View style={styles.myRankBadge}>
              {myRank > 0
                ? <><Text style={styles.myRankNum}>#{myRank}</Text><Text style={styles.myRankLabel}>in class</Text></>
                : <><Text style={styles.myRankNum}>—</Text><Text style={styles.myRankLabel}>not ranked</Text></>
              }
            </View>
          </View>
        )}

        {/* Edit / Set up buttons */}
        <TouchableOpacity style={styles.editBtn} onPress={() => setScreen('form')}>
          <Text style={styles.editBtnText}>{myProfile ? '✏️  Edit My Stats' : '+ Set Up My Profile'}</Text>
        </TouchableOpacity>

        {/* Filter bar */}
        <View style={styles.filterBar}>
          <View style={styles.toggle}>
            {(['male', 'female'] as Gender[]).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.toggleBtn, filterGender === g && styles.toggleBtnActive]}
                onPress={() => {
                  setFilterGender(g);
                  setFilterClass(classesForGender(g)[0]);
                }}
              >
                <Text style={[styles.toggleBtnText, filterGender === g && styles.toggleBtnTextActive]}>
                  {g === 'male' ? 'Male' : 'Female'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll} contentContainerStyle={{ gap: 6 }}>
            {classesForGender(filterGender).map((wc) => (
              <TouchableOpacity
                key={wc}
                style={[styles.classChip, filterClass === wc && styles.classChipActive]}
                onPress={() => setFilterClass(wc)}
              >
                <Text style={[styles.classChipText, filterClass === wc && styles.classChipTextActive]}>{wc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Leaderboard table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.rankCell, styles.tableHeaderText]}>#</Text>
            <Text style={[styles.tableCell, styles.nameCell, styles.tableHeaderText]}>Athlete</Text>
            <Text style={[styles.tableCell, styles.liftCell, styles.tableHeaderText]}>S</Text>
            <Text style={[styles.tableCell, styles.liftCell, styles.tableHeaderText]}>B</Text>
            <Text style={[styles.tableCell, styles.liftCell, styles.tableHeaderText]}>D</Text>
            <Text style={[styles.tableCell, styles.totalCell, styles.tableHeaderText]}>Total</Text>
          </View>

          {boardLoading ? (
            <ActivityIndicator style={{ padding: 24 }} color="#10b981" />
          ) : leaderboard.length === 0 ? (
            <Text style={styles.emptyBoard}>No lifters in this class yet. Be the first!</Text>
          ) : (
            leaderboard.map((entry, i) => {
              const isMe = entry.userId === myProfile?.userId;
              return (
                <View key={entry.userId} style={[styles.tableRow, isMe && styles.tableRowMe, i % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.rankCell, styles.rankText, i < 3 && styles.rankTop]}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </Text>
                  <Text style={[styles.tableCell, styles.nameCell, styles.nameText]} numberOfLines={1}>
                    {entry.displayName}{isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={[styles.tableCell, styles.liftCell]}>{entry.squat}</Text>
                  <Text style={[styles.tableCell, styles.liftCell]}>{entry.bench}</Text>
                  <Text style={[styles.tableCell, styles.liftCell]}>{entry.deadlift}</Text>
                  <Text style={[styles.tableCell, styles.totalCell, styles.totalText]}>{entry.total}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#f9fafb' },
  scroll:          { padding: 16, gap: 12 },
  lockedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  lockedIcon:      { fontSize: 56, marginBottom: 16 },
  lockedTitle:     { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  lockedDesc:      { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  backBtn:         { alignSelf: 'flex-end', marginBottom: 4 },
  backBtnText:     { color: '#10b981', fontSize: 14, fontWeight: '600' },
  pageTitle:       { fontSize: 22, fontWeight: '800', color: '#111827' },
  pageSubtitle:    { fontSize: 13, color: '#6b7280', lineHeight: 19 },

  // Form
  card:            { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, gap: 10 },
  cardTitle:       { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 },
  fieldLabel:      { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  input:           { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  weightClassHint: { fontSize: 12, color: '#10b981', fontWeight: '600', marginTop: -4 },
  toggle:          { flexDirection: 'row', gap: 8 },
  toggleBtn:       { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#111827' },
  toggleBtnText:   { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  toggleBtnTextActive: { color: '#fff' },
  liftRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liftLabel:       { width: 90, fontSize: 14, color: '#374151', fontWeight: '600' },
  liftInput:       { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: '#111827', textAlign: 'right' },
  liftUnit:        { width: 24, fontSize: 13, color: '#9ca3af' },
  totalPreview:    { fontSize: 13, fontWeight: '700', color: '#10b981', textAlign: 'right' },
  formError:       { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  saveBtn:         { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  // My card
  myCard:          { backgroundColor: '#111827', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  myName:          { fontSize: 16, fontWeight: '700', color: '#fff' },
  myClass:         { fontSize: 12, color: '#9ca3af', marginTop: 2, marginBottom: 8 },
  myLifts:         { flexDirection: 'row', gap: 12 },
  myLift:          { alignItems: 'center' },
  myLiftTotal:     { borderLeftWidth: 1, borderLeftColor: '#374151', paddingLeft: 12 },
  myLiftVal:       { fontSize: 16, fontWeight: '800', color: '#fff' },
  myLiftTotalVal:  { color: '#10b981' },
  myLiftLabel:     { fontSize: 10, color: '#6b7280', marginTop: 1 },
  myRankBadge:     { alignItems: 'center', marginLeft: 12 },
  myRankNum:       { fontSize: 28, fontWeight: '800', color: '#fbbf24' },
  myRankLabel:     { fontSize: 10, color: '#9ca3af' },

  editBtn:         { backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  editBtnText:     { color: '#374151', fontWeight: '600', fontSize: 13 },

  // Filter
  filterBar:       { gap: 8 },
  classScroll:     { marginTop: 2 },
  classChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  classChipActive: { backgroundColor: '#10b981' },
  classChipText:   { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  classChipTextActive: { color: '#fff' },

  // Table
  tableCard:       { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  tableHeader:     { flexDirection: 'row', backgroundColor: '#f9fafb', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableHeaderText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  tableRow:        { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  tableRowAlt:     { backgroundColor: '#fafafa' },
  tableRowMe:      { backgroundColor: '#ecfdf5' },
  tableCell:       { fontSize: 13, color: '#374151', textAlignVertical: 'center' },
  rankCell:        { width: 32 },
  nameCell:        { flex: 1, paddingRight: 8 },
  liftCell:        { width: 42, textAlign: 'right' },
  totalCell:       { width: 48, textAlign: 'right' },
  rankText:        { fontWeight: '700', color: '#374151' },
  rankTop:         { fontSize: 16 },
  nameText:        { fontWeight: '600', color: '#111827' },
  totalText:       { fontWeight: '800', color: '#10b981' },
  emptyBoard:      { textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 32, lineHeight: 20 },
});
