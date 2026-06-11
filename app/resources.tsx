import { View, Text, TouchableOpacity, ScrollView, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type Resource = { title: string; url: string };
type Category = {
  label: string;
  iconName: IoniconsName;
  iconColor: string;
  accentColor: string;
  bgColor: string;
  resources: Resource[];
};

const CATEGORIES: Category[] = [
  {
    label: 'Overall Techniques',
    iconName: 'fitness-outline',
    iconColor: '#2563eb',
    accentColor: '#dbeafe',
    bgColor: '#eff6ff',
    resources: [
      { title: 'Powerlifting for Beginners — Full Guide', url: 'https://www.youtube.com/watch?v=FZvbJiGQCR8' },
    ],
  },
  {
    label: 'Squat Techniques',
    iconName: 'body-outline',
    iconColor: '#16a34a',
    accentColor: '#dcfce7',
    bgColor: '#f0fdf4',
    resources: [
      { title: 'Squat Mechanics & Setup', url: 'https://www.youtube.com/watch?v=XwF-N4CO96I' },
      { title: 'Squat Depth & Technique Fixes', url: 'https://www.youtube.com/watch?v=PIHPfE_jgHI' },
    ],
  },
  {
    label: 'Bench Press Techniques',
    iconName: 'barbell-outline',
    iconColor: '#ea580c',
    accentColor: '#ffedd5',
    bgColor: '#fff7ed',
    resources: [
      { title: 'Bench Press — Full Tutorial', url: 'https://www.youtube.com/watch?v=G3YYemADBPk' },
      { title: 'Bench Press Setup & Technique', url: 'https://www.youtube.com/watch?v=jeA2AUGe5_M&t=10s' },
    ],
  },
  {
    label: 'Deadlift Techniques',
    iconName: 'arrow-up-circle-outline',
    iconColor: '#7c3aed',
    accentColor: '#ede9fe',
    bgColor: '#fdf4ff',
    resources: [
      { title: 'Deadlift — Step by Step', url: 'https://www.youtube.com/watch?v=jiomwLGusLA' },
      { title: 'Deadlift Technique Masterclass', url: 'https://www.youtube.com/watch?v=5MQvRVnCyi4&t=325s' },
    ],
  },
];

export default function ResourcesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resources</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Curated training tutorials to improve your technique.</Text>

        {CATEGORIES.map((cat) => (
          <View key={cat.label} style={[styles.section, { backgroundColor: cat.bgColor }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: cat.accentColor }]}>
                <Ionicons name={cat.iconName} size={18} color={cat.iconColor} />
              </View>
              <Text style={[styles.sectionLabel, { color: cat.iconColor }]}>{cat.label}</Text>
            </View>

            {cat.resources.map((res, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.linkRow}
                onPress={() => Linking.openURL(res.url)}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-youtube" size={20} color="#ef4444" />
                <Text style={styles.linkTitle} numberOfLines={2}>{res.title}</Text>
                <Ionicons name="open-outline" size={15} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f9fafb' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backBtn:     { color: '#6b7280', fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  scroll:   { padding: 16, gap: 14, paddingBottom: 32 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 4 },

  section: {
    borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: { fontSize: 14, fontWeight: '700' },

  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff99', borderRadius: 10, padding: 11,
    marginBottom: 6,
  },
  linkTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827', lineHeight: 18 },
});
