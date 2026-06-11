import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useWorkoutStore } from '../../hooks/useWorkoutStore';
import {
  BG, CARD, BORDER, TEXT, MUTED, DIM,
  ACCENT, ACCENT_DARK, SERIF,
} from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const features: Array<{
  route: string; iconName: IoniconsName; iconColor: string;
  label: string; desc: string; color: string; border: string;
}> = [
  { route: '/calories',  iconName: 'nutrition', iconColor: '#059669', label: 'Calorie Tracker',  desc: 'Log meals and track daily intake.',        color: '#d1fae5', border: '#6ee7b7' },
  { route: '/workouts',  iconName: 'barbell',   iconColor: '#2563eb', label: 'Workout Plans',    desc: 'Follow structured training plans.',        color: '#dbeafe', border: '#93c5fd' },
  { route: '/exercises', iconName: 'body',      iconColor: '#7c3aed', label: 'Exercise Library', desc: 'Video demos and step-by-step guidance.',   color: '#ede9fe', border: '#c4b5fd' },
  { route: '/gallery',   iconName: 'images',    iconColor: '#ea580c', label: 'Gallery',          desc: 'Photos of your meals and workouts.',       color: '#ffedd5', border: '#fdba74' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { workoutState } = useWorkoutStore();

  const rankingUnlocked = (workoutState.planHistory ?? []).length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
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

        {features.map((f) => (
          <TouchableOpacity
            key={f.route}
            style={[styles.card, { backgroundColor: f.color, borderColor: f.border }]}
            onPress={() => router.push(f.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: f.iconColor + '20' }]}>
              <Ionicons name={f.iconName} size={22} color={f.iconColor} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{f.label}</Text>
              <Text style={styles.cardDesc}>{f.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={f.iconColor + 'aa'} />
          </TouchableOpacity>
        ))}

        {/* Ranking card */}
        <TouchableOpacity
          style={[styles.card, styles.rankingCard, !rankingUnlocked && styles.rankingCardLocked]}
          onPress={() => router.push('/ranking' as any)}
          activeOpacity={rankingUnlocked ? 0.8 : 0.6}
        >
          <View style={[styles.cardIconWrap, { backgroundColor: rankingUnlocked ? '#a8780020' : '#9ca3af20' }]}>
            <Ionicons name={rankingUnlocked ? 'trophy' : 'lock-closed'} size={22} color={rankingUnlocked ? '#a87800' : '#9ca3af'} />
          </View>
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
          <Ionicons
            name={rankingUnlocked ? 'chevron-forward' : 'lock-closed'}
            size={16}
            color={rankingUnlocked ? '#a87800aa' : '#9ca3af66'}
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  heroTitle:          { fontSize: 20, fontWeight: '800', color: TEXT, fontFamily: SERIF, letterSpacing: -0.3 },
  userEmail:          { fontSize: 10, color: DIM, marginTop: 1 },
  signOutBtn:         { backgroundColor: CARD, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER },
  signOutText:        { color: ACCENT_DARK, fontWeight: '700', fontSize: 12 },

  scroll:             { padding: 14, gap: 8, paddingBottom: 20 },
  heroSub:            { fontSize: 12, color: MUTED, marginBottom: 2, letterSpacing: 0.1 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1.5, padding: 13,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardIconWrap:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardText:           { flex: 1 },
  cardLabel:          { fontSize: 14, fontWeight: '700', color: TEXT, letterSpacing: -0.1 },
  cardDesc:           { fontSize: 11, color: '#6b7280', lineHeight: 15, marginTop: 1 },

  rankingCard:        { backgroundColor: '#fefce8', borderColor: '#fde68a' },
  rankingCardLocked:  { backgroundColor: CARD, borderColor: BORDER },
  rankingLabelLocked: { color: MUTED },
  rankingDescLocked:  { color: DIM },
});
