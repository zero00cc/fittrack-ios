import { ScrollView, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exercises } from '../../data/exercises';

export default function ExercisesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>Step-by-step guidance for each exercise.</Text>
        {exercises.map((ex) => (
          <View key={ex.id} style={styles.card}>
            {/* Header */}
            <Text style={styles.name}>{ex.name}</Text>
            <View style={styles.chips}>
              {ex.muscleGroups.map((m) => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipText}>{m}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.desc}>{ex.description}</Text>

            {/* Video link */}
            {ex.youtubeId ? (
              <TouchableOpacity
                style={styles.videoBtn}
                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${ex.youtubeId}`)}
              >
                <Text style={styles.videoBtnText}>▶  Watch Video on YouTube</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderText}>🎬  Video coming soon</Text>
              </View>
            )}

            {/* Steps */}
            <Text style={styles.sectionLabel}>How to perform</Text>
            {ex.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}

            {/* Tips */}
            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Tips & cues</Text>
            {ex.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 16 },
  subtitle: { fontSize: 13, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, gap: 10 },
  name: { fontSize: 20, fontWeight: '800', color: '#111827' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#ecfdf5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, color: '#059669', fontWeight: '600' },
  desc: { fontSize: 13, color: '#6b7280', lineHeight: 19 },
  videoBtn: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 14, alignItems: 'center' },
  videoBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  videoPlaceholder: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  videoPlaceholderText: { color: '#9ca3af', fontSize: 13 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet: { color: '#10b981', fontSize: 15, fontWeight: '700', marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
});
