import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { GalleryCategory } from '../types/gallery.types';
import { generateId } from '../utils/calorieUtils';
import { todayYMD } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const META_KEY   = 'fittrack_gallery_meta';
const GALLERY_DIR = `${FileSystem.documentDirectory ?? ''}fittrack_gallery/`;
const BUCKET     = 'gallery';

export interface GalleryItemMeta {
  id: string;
  name: string;
  date: string;
  category: GalleryCategory;
  uri: string;          // local file path
  storagePath?: string; // Supabase Storage path, present for synced items
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(GALLERY_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(GALLERY_DIR, { intermediates: true });
}

function mimeType(ext: string) {
  return ext === 'png' ? 'image/png' : 'image/jpeg';
}

export function useGalleryStore() {
  const { user } = useAuth();
  const [items, setItems]     = useState<GalleryItemMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Load local metadata on mount
  useEffect(() => {
    AsyncStorage.getItem(META_KEY)
      .then((raw) => { if (raw) setItems(JSON.parse(raw)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveMeta = useCallback((updated: GalleryItemMeta[]) => {
    setItems(updated);
    AsyncStorage.setItem(META_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  // Pull remote gallery when user signs in and merge any items not stored locally
  useEffect(() => {
    if (!user) return;

    supabase
      .from('gallery_items')
      .select('id, name, date, category, storage_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data || data.length === 0) return;

        const raw     = await AsyncStorage.getItem(META_KEY);
        const current: GalleryItemMeta[] = raw ? JSON.parse(raw) : [];
        const localIds = new Set(current.map((i) => i.id));
        const missing  = data.filter((r: any) => !localIds.has(r.id));
        if (missing.length === 0) return;

        await ensureDir();
        const downloaded: GalleryItemMeta[] = [];

        for (const remote of missing) {
          try {
            const ext     = remote.storage_path.split('.').pop() ?? 'jpg';
            const destUri = `${GALLERY_DIR}${remote.id}.${ext}`;

            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(remote.storage_path, 300);

            if (signed?.signedUrl) {
              const result = await FileSystem.downloadAsync(signed.signedUrl, destUri);
              downloaded.push({
                id:          remote.id,
                name:        remote.name,
                date:        remote.date,
                category:    remote.category as GalleryCategory,
                uri:         result.uri,
                storagePath: remote.storage_path,
              });
            }
          } catch {
            // skip items that fail to download; they can retry on next sign-in
          }
        }

        if (downloaded.length > 0) {
          setItems((prev) => {
            const merged = [...downloaded, ...prev];
            AsyncStorage.setItem(META_KEY, JSON.stringify(merged)).catch(() => {});
            return merged;
          });
        }
      });
  }, [user?.id]);

  const addImage = useCallback(
    async (sourceUri: string, category: GalleryCategory) => {
      await ensureDir();
      const id  = generateId();
      const ext = sourceUri.split('.').pop() ?? 'jpg';
      const destUri     = `${GALLERY_DIR}${id}.${ext}`;
      const storagePath = user ? `${user.id}/${id}.${ext}` : undefined;

      await FileSystem.copyAsync({ from: sourceUri, to: destUri });

      const item: GalleryItemMeta = {
        id,
        name: `${category}_${id}.${ext}`,
        date: todayYMD(),
        category,
        uri: destUri,
        storagePath,
      };
      saveMeta([item, ...items]);

      // Upload to Supabase Storage and record metadata — fire-and-forget
      if (user && storagePath) {
        (async () => {
          try {
            const response = await fetch(destUri);
            const blob     = await response.blob();
            const { error: uploadErr } = await supabase.storage
              .from(BUCKET)
              .upload(storagePath, blob, { contentType: mimeType(ext) });
            if (!uploadErr) {
              await supabase.from('gallery_items').insert({
                id,
                user_id:      user.id,
                name:         item.name,
                date:         item.date,
                category,
                storage_path: storagePath,
              });
            }
          } catch {
            // local copy already saved; Supabase push is best-effort
          }
        })();
      }
    },
    [items, saveMeta, user],
  );

  const deleteImage = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        await FileSystem.deleteAsync(item.uri, { idempotent: true }).catch(() => {});
      }
      saveMeta(items.filter((i) => i.id !== id));

      // Remove from Supabase Storage and DB — fire-and-forget
      if (user && item?.storagePath) {
        supabase.storage.from(BUCKET).remove([item.storagePath]).catch(() => {});
        void supabase.from('gallery_items').delete().eq('id', id).then(undefined, () => {});
      }
    },
    [items, saveMeta, user],
  );

  return { items, loading, addImage, deleteImage };
}
