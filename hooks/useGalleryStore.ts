import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// expo-file-system v56 moved legacy API to a sub-path
import * as FileSystem from 'expo-file-system/legacy';
import { GalleryCategory } from '../types/gallery.types';
import { generateId } from '../utils/calorieUtils';
import { todayYMD } from '../utils/dateUtils';

const META_KEY = 'fittrack_gallery_meta';
const GALLERY_DIR = `${FileSystem.documentDirectory ?? ''}fittrack_gallery/`;

export interface GalleryItemMeta {
  id: string;
  name: string;
  date: string;
  category: GalleryCategory;
  uri: string; // local file URI
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(GALLERY_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(GALLERY_DIR, { intermediates: true });
}

export function useGalleryStore() {
  const [items, setItems] = useState<GalleryItemMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(META_KEY)
      .then((raw) => {
        if (raw) setItems(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveMeta = useCallback((updated: GalleryItemMeta[]) => {
    setItems(updated);
    AsyncStorage.setItem(META_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const addImage = useCallback(
    async (sourceUri: string, category: GalleryCategory) => {
      await ensureDir();
      const id = generateId();
      const ext = sourceUri.split('.').pop() ?? 'jpg';
      const destUri = `${GALLERY_DIR}${id}.${ext}`;
      await FileSystem.copyAsync({ from: sourceUri, to: destUri });
      const item: GalleryItemMeta = {
        id,
        name: `${category}_${id}.${ext}`,
        date: todayYMD(),
        category,
        uri: destUri,
      };
      const updated = [item, ...items];
      saveMeta(updated);
    },
    [items, saveMeta],
  );

  const deleteImage = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        await FileSystem.deleteAsync(item.uri, { idempotent: true }).catch(() => {});
      }
      const updated = items.filter((i) => i.id !== id);
      saveMeta(updated);
    },
    [items, saveMeta],
  );

  return { items, loading, addImage, deleteImage };
}
