import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList,
  StyleSheet, Alert, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useGalleryStore } from '../../hooks/useGalleryStore';
import { GalleryCategory } from '../../types/gallery.types';

const { width } = Dimensions.get('window');
const COLS = 3;
const TILE = (width - 32 - (COLS - 1) * 4) / COLS;

const TABS: Array<{ key: GalleryCategory; label: string; icon: string }> = [
  { key: 'meal', label: 'Meals', icon: '🍽️' },
  { key: 'workout', label: 'Workouts', icon: '💪' },
];

export default function GalleryScreen() {
  const { items, loading, addImage, deleteImage } = useGalleryStore();
  const [tab, setTab] = useState<GalleryCategory>('meal');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = items.filter((i) => i.category === tab);

  async function handleUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await addImage(result.assets[0].uri, tab);
    }
  }

  function handleDelete(id: string) {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteImage(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
              {t.icon} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Upload button */}
      <View style={styles.uploadRow}>
        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
          <Text style={styles.uploadBtnText}>+ Upload Photo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><Text style={styles.loading}>Loading…</Text></View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{tab === 'meal' ? '🍽️' : '💪'}</Text>
          <Text style={styles.emptyText}>No {tab} photos yet.</Text>
          <Text style={styles.emptyHint}>Tap "Upload Photo" to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={COLS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 4 }}
          ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.tile}
              onPress={() => setLightbox(item.uri)}
              onLongPress={() => handleDelete(item.id)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.uri }} style={styles.tileImage} />
              <View style={styles.tileOverlay}>
                <Text style={styles.tileDate}>{item.date}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Lightbox */}
      <Modal visible={!!lightbox} transparent animationType="fade">
        <TouchableOpacity style={styles.lightboxBg} onPress={() => setLightbox(null)} activeOpacity={1}>
          {lightbox && (
            <Image source={{ uri: lightbox }} style={styles.lightboxImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightbox(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#10b981' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabBtnTextActive: { color: '#10b981' },
  uploadRow: { padding: 12 },
  uploadBtn: { backgroundColor: '#10b981', borderRadius: 12, padding: 12, alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#9ca3af' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptyHint: { fontSize: 13, color: '#9ca3af' },
  grid: { padding: 12 },
  tile: { width: TILE, height: TILE, borderRadius: 8, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  tileImage: { width: TILE, height: TILE },
  tileOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 4, paddingVertical: 2 },
  tileDate: { color: '#fff', fontSize: 9, fontWeight: '600' },
  lightboxBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
  lightboxClose: { position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lightboxCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
