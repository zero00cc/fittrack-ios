import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useWorkoutStore } from '../../hooks/useWorkoutStore';

const features = [
  { route: '/calories',  icon: '🥗', label: 'Calorie Tracker',  desc: 'Log meals and track daily intake.',       color: '#d1fae5', border: '#6ee7b7' },
  { route: '/workouts',  icon: '🏋️', label: 'Workout Plans',    desc: 'Follow structured training plans.',       color: '#dbeafe', border: '#93c5fd' },
  { route: '/exercises', icon: '🎬', label: 'Exercise Library',  desc: 'Video demos and step-by-step guidance.', color: '#ede9fe', border: '#c4b5fd' },
  { route: '/gallery',   icon: '📸', label: 'Gallery',           desc: 'Photos of your meals and workouts.',     color: '#ffedd5', border: '#fdba74' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { workoutState } = useWorkoutStore();

  const rankingUnlocked = (workoutState.planHistory ?? []).length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header row with title + sign-out */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heroTitle}>FitTrack</Text>
          {user && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroSub}>Track your nutrition and train with purpose.</Text>

        {/* Feature cards — single column */}
        {features.map((f) => (
          <TouchableOpacity
            key={f.route}
            style={[styles.card, { backgroundColor: f.color, borderColor: f.border }]}
            onPress={() => router.push(f.route)}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>{f.icon}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{f.label}</Text>
              <Text style={styles.cardDesc}>{f.desc}</Text>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Ranking card */}
        <TouchableOpacity
          style={[styles.card, styles.rankingCard, !rankingUnlocked && styles.rankingCardLocked]}
          onPress={() => router.push('/ranking' as any)}
          activeOpacity={rankingUnlocked ? 0.8 : 0.6}
        >
          <Text style={styles.cardIcon}>{rankingUnlocked ? '🏆' : '🔒'}</Text>
          <View style={styles.cardText}>
            <Text style={[styles.cardLabel, !rankingUnlocked && styles.rankingLabelLocked]}>
              Global Ranking
            </Text>
            <Text style={[styles.cardDesc, !rankingUnlocked && styles.rankingDescLocked]}>
              {rankingUnlocked
                ? 'See how your squat, bench & deadlift stack up worldwide.'
                : 'Complete a workout plan to unlock the leaderboard.'}
            </Text>
          </View>
          <Text style={[styles.cardChevron, !rankingUnlocked && { opacity: 0.3 }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  heroTitle:          { fontSize: 22, fontWeight: '800', color: '#111827' },
  userEmail:          { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  signOutBtn:         { backgroundColor: '#fee2e2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  signOutText:        { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  scroll:             { padding: 16, gap: 10 },
  heroSub:            { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, borderWidth: 2, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cardIcon:           { fontSize: 30, width: 38, textAlign: 'center' },
  cardText:           { flex: 1 },
  cardLabel:          { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardDesc:           { fontSize: 12, color: '#6b7280', lineHeight: 17, marginTop: 2 },
  cardChevron:        { fontSize: 24, color: '#9ca3af', fontWeight: '300' },
  // Ranking overrides
  rankingCard:        { backgroundColor: '#fefce8', borderColor: '#fde68a' },
  rankingCardLocked:  { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  rankingLabelLocked: { color: '#9ca3af' },
  rankingDescLocked:  { color: '#9ca3af' },
});
