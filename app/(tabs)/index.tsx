import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const features = [
  { route: '/calories', icon: '🥗', label: 'Calorie Tracker', desc: 'Log meals and track daily intake.', color: '#d1fae5', border: '#6ee7b7' },
  { route: '/workouts', icon: '🏋️', label: 'Workout Plans', desc: 'Follow structured training plans.', color: '#dbeafe', border: '#93c5fd' },
  { route: '/exercises', icon: '🎬', label: 'Exercise Library', desc: 'Video demos and step-by-step guidance.', color: '#ede9fe', border: '#c4b5fd' },
  { route: '/gallery', icon: '📸', label: 'Gallery', desc: 'Photos of your meals and workouts.', color: '#ffedd5', border: '#fdba74' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Welcome to FitTrack</Text>
          <Text style={styles.heroSub}>Track your nutrition and train with purpose.</Text>
          {user && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>
        <View style={styles.grid}>
          {features.map((f) => (
            <TouchableOpacity
              key={f.route}
              style={[styles.card, { backgroundColor: f.color, borderColor: f.border }]}
              onPress={() => router.push(f.route)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardIcon}>{f.icon}</Text>
              <Text style={styles.cardLabel}>{f.label}</Text>
              <Text style={styles.cardDesc}>{f.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 16 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  heroSub: { fontSize: 15, color: '#6b7280', marginTop: 6, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', borderRadius: 16, borderWidth: 2, padding: 16,
    gap: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cardIcon: { fontSize: 32 },
  cardLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardDesc:     { fontSize: 12, color: '#6b7280', lineHeight: 17 },
  userEmail:    { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  signOutBtn:   { marginTop: 8, alignItems: 'center', paddingVertical: 14, backgroundColor: '#fee2e2', borderRadius: 12 },
  signOutText:  { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});
