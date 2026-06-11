import { ScrollView, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { exercises } from '../../data/exercises';

// Local video assets — keyed by exercise id
const LOCAL_VIDEOS: Record<string, number> = {
  'squat':       require('../../assets/videos/squat_example.mp4'),
  'bench-press': require('../../assets/videos/bench_example.mp4'),
  'deadlift':    require('../../assets/videos/deadlift_example.mp4'),
};

function LocalVideoPlayer({ source }: { source: number }) {
  const player = useVideoPlayer(source, (p) => { p.loop = false; });
  return (
    <VideoView
      player={player}
      style={styles.video}
      nativeControls
      contentFit="contain"
    />
  );
}

export default function ExercisesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>Step-by-step guidance for each exercise.</Text>
        {exercises.map((ex) => {
          const localVideo = LOCAL_VIDEOS[ex.id];
          return (
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

              {/* Video — local mp4 takes priority, then YouTube, then placeholder */}
              {localVideo ? (
                <LocalVideoPlayer source={localVideo} />
              ) : ex.youtubeId ? (
                <TouchableOpacity
                  style={styles.videoBtn}
                  onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${ex.youtubeId}`)}
                >
                  <Text style={styles.videoBtnText}>▶  Watch Video on YouTube</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="play-circle-outline" size={22} color="#9ca3af" />
                  <Text style={styles.videoPlaceholderText}>Video coming soon</Text>
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
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: '#f9fafb' },
  scroll:   { padding: 16, gap: 16 },
  subtitle: { fontSize: 13, color: '#6b7280' },
  card:     { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, gap: 10 },
  name:     { fontSize: 20, fontWeight: '800', color: '#111827' },
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:     { backgroundColor: '#ecfdf5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, color: '#059669', fontWeight: '600' },
  desc:     { fontSize: 13, color: '#6b7280', lineHeight: 19 },

  video:              { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#000', overflow: 'hidden' },
  videoBtn:           { backgroundColor: '#fee2e2', borderRadius: 12, padding: 14, alignItems: 'center' },
  videoBtnText:       { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  videoPlaceholder:   { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  videoPlaceholderText: { color: '#9ca3af', fontSize: 13 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  stepRow:      { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNum:      { width: 20, height: 20, borderRadius: 10, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  stepText:     { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  tipRow:       { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet:    { color: '#10b981', fontSize: 15, fontWeight: '700', marginTop: 1 },
  tipText:      { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
});
