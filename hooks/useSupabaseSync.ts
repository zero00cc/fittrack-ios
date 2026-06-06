/**
 * Local-first sync layer.
 *
 * Each hook:
 *   1. Returns data from AsyncStorage immediately (cache-first, snappy UX).
 *   2. On mount, fetches the latest value from Supabase and merges it if
 *      the remote record is newer than the local one.
 *   3. On every write, updates AsyncStorage first then pushes to Supabase
 *      in the background (fire-and-forget so the UI never waits).
 */

import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Table = 'calorie_settings' | 'calorie_history' | 'workout_state';

// Upsert a JSON blob for the signed-in user, keyed by table name.
async function pushToSupabase(
  table: Table,
  userId: string,
  payload: object,
): Promise<void> {
  await supabase.from(table).upsert(
    { user_id: userId, data: payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

async function fetchFromSupabase(
  table: Table,
  userId: string,
): Promise<{ data: unknown; updated_at: string } | null> {
  const { data, error } = await supabase
    .from(table)
    .select('data, updated_at')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data as { data: unknown; updated_at: string };
}

// calorie_settings stores { daily_target } not as JSON blob, so handle separately
async function pushSettingsToSupabase(userId: string, dailyTarget: number): Promise<void> {
  await supabase.from('calorie_settings').upsert(
    { user_id: userId, daily_target: dailyTarget, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

async function fetchSettingsFromSupabase(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('calorie_settings')
    .select('daily_target')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return (data as { daily_target: number }).daily_target;
}

/**
 * Syncs calorie history between AsyncStorage and Supabase.
 * Call this once when the user is authenticated; pass the raw setter
 * from useAsyncStorage so updates are reflected in the UI.
 */
export function useCalorieHistorySync(
  localValue: object,
  setLocalValue: (v: object) => void,
  cacheKey: string,
) {
  const { user } = useAuth();
  const syncing = useRef(false);

  // Pull from Supabase on mount / when user changes
  useEffect(() => {
    if (!user) return;
    fetchFromSupabase('calorie_history', user.id).then((remote) => {
      if (!remote) return;
      // Use remote if it's newer — simple last-write-wins
      AsyncStorage.getItem(cacheKey + '_updated_at').then((localTs) => {
        if (!localTs || remote.updated_at > localTs) {
          setLocalValue(remote.data as object);
          AsyncStorage.setItem(cacheKey + '_updated_at', remote.updated_at);
        }
      });
    });
  }, [user?.id]);

  // Return a push helper to call after every local write
  const push = useCallback(
    (newValue: object) => {
      if (!user || syncing.current) return;
      syncing.current = true;
      const ts = new Date().toISOString();
      AsyncStorage.setItem(cacheKey + '_updated_at', ts).finally(() => {
        syncing.current = false;
      });
      pushToSupabase('calorie_history', user.id, newValue).catch(() => {});
    },
    [user?.id, cacheKey],
  );

  return { push };
}

export function useCalorieSettingsSync(
  localTarget: number,
  setLocalTarget: (v: number) => void,
) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchSettingsFromSupabase(user.id).then((remote) => {
      if (remote !== null) setLocalTarget(remote);
    });
  }, [user?.id]);

  const push = useCallback(
    (newTarget: number) => {
      if (!user) return;
      pushSettingsToSupabase(user.id, newTarget).catch(() => {});
    },
    [user?.id],
  );

  return { push };
}

export function useWorkoutStateSync(
  localValue: object,
  setLocalValue: (v: object) => void,
  cacheKey: string,
) {
  const { user } = useAuth();
  const syncing = useRef(false);

  useEffect(() => {
    if (!user) return;
    fetchFromSupabase('workout_state', user.id).then((remote) => {
      if (!remote) return;
      AsyncStorage.getItem(cacheKey + '_updated_at').then((localTs) => {
        if (!localTs || remote.updated_at > localTs) {
          setLocalValue(remote.data as object);
          AsyncStorage.setItem(cacheKey + '_updated_at', remote.updated_at);
        }
      });
    });
  }, [user?.id]);

  const push = useCallback(
    (newValue: object) => {
      if (!user || syncing.current) return;
      syncing.current = true;
      const ts = new Date().toISOString();
      AsyncStorage.setItem(cacheKey + '_updated_at', ts).finally(() => {
        syncing.current = false;
      });
      pushToSupabase('workout_state', user.id, newValue).catch(() => {});
    },
    [user?.id, cacheKey],
  );

  return { push };
}
