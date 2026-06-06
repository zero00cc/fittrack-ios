import { useCallback, useEffect, useRef } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import { CalorieHistory, CalorieSettings, DailyLog, MealEntry } from '../types/calorie.types';
import { todayYMD } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const HISTORY_KEY  = 'fittrack_calorie_history';
const SETTINGS_KEY = 'fittrack_calorie_settings';

const defaultHistory:  CalorieHistory  = {};
const defaultSettings: CalorieSettings = { dailyTarget: 2000 };

export function useCalorieStore() {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const [history,  setHistory,  historyLoaded]  = useAsyncStorage<CalorieHistory>(HISTORY_KEY,  defaultHistory);
  const [settings, setSettings, settingsLoaded] = useAsyncStorage<CalorieSettings>(SETTINGS_KEY, defaultSettings);

  // ── Pull from Supabase once when the user signs in ──────────────
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('calorie_history').select('data').eq('user_id', user.id).single(),
      supabase.from('calorie_settings').select('daily_target').eq('user_id', user.id).single(),
    ]).then(([hRes, sRes]) => {
      if (hRes.data?.data)     setHistory(hRes.data.data as CalorieHistory);
      if (sRes.data?.daily_target !== undefined)
        setSettings({ dailyTarget: sRes.data.daily_target });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Supabase push helpers ────────────────────────────────────────
  function pushHistory(newHistory: CalorieHistory) {
    const u = userRef.current;
    if (!u) return;
    supabase.from('calorie_history').upsert(
      { user_id: u.id, data: newHistory, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    ).catch(() => {});
  }

  function pushSettings(dailyTarget: number) {
    const u = userRef.current;
    if (!u) return;
    supabase.from('calorie_settings').upsert(
      { user_id: u.id, daily_target: dailyTarget, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    ).catch(() => {});
  }

  // ── Actions ──────────────────────────────────────────────────────
  const today = todayYMD();
  const todayLog: DailyLog = history[today] ?? { date: today, entries: [] };

  const addEntry = useCallback(
    (entry: MealEntry) => {
      const current    = history[today] ?? { date: today, entries: [] };
      const newHistory = { ...history, [today]: { ...current, entries: [...current.entries, entry] } };
      setHistory(newHistory);
      pushHistory(newHistory);
    },
    [history, setHistory, today, user?.id],
  );

  const removeEntry = useCallback(
    (entryId: string) => {
      const current    = history[today] ?? { date: today, entries: [] };
      const newHistory = { ...history, [today]: { ...current, entries: current.entries.filter((e) => e.id !== entryId) } };
      setHistory(newHistory);
      pushHistory(newHistory);
    },
    [history, setHistory, today, user?.id],
  );

  const setTarget = useCallback(
    (target: number) => {
      setSettings({ ...settings, dailyTarget: target });
      pushSettings(target);
    },
    [settings, setSettings, user?.id],
  );

  return {
    history,
    todayLog,
    settings,
    loaded: historyLoaded && settingsLoaded,
    addEntry,
    removeEntry,
    setTarget,
  };
}
