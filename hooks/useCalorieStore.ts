import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAsyncStorage } from './useAsyncStorage';
import { CalorieHistory, CalorieGoals, MacroEntry } from '../types/calorie.types';
import { todayYMD } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const HISTORY_KEY = 'fittrack_calorie_history';
const GOALS_KEY   = 'fittrack_calorie_settings';

const defaultHistory: CalorieHistory = {};
const defaultGoals: CalorieGoals     = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

export function useCalorieStore() {
  const { user } = useAuth();
  const userRef   = useRef(user);
  userRef.current = user;

  const [history, setHistory, historyLoaded] = useAsyncStorage<CalorieHistory>(HISTORY_KEY, defaultHistory);
  const [goals,   setGoals,   goalsLoaded]   = useAsyncStorage<CalorieGoals>(GOALS_KEY, defaultGoals);

  // Pull from Supabase on sign-in
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('calorie_history').select('data').eq('user_id', user.id).single(),
      supabase.from('calorie_settings').select('daily_target').eq('user_id', user.id).single(),
    ]).then(([hRes, sRes]) => {
      if (hRes.data?.data) setHistory(hRes.data.data as CalorieHistory);
      if (sRes.data?.daily_target !== undefined)
        setGoals((prev) => ({ ...defaultGoals, ...prev, calories: sRes.data!.daily_target }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function pushHistory(h: CalorieHistory) {
    const u = userRef.current;
    if (!u) return;
    void supabase.from('calorie_history')
      .upsert({ user_id: u.id, data: h, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .then(undefined, () => {});
  }

  const today    = todayYMD();
  const todayLog = history[today] ?? { date: today, entries: [] };

  // ── Add/remove for today ────────────────────────────────────────────────────

  const addEntry = useCallback(
    (entry: MacroEntry) => {
      setHistory((prev) => {
        const current    = prev[entry.date] ?? { date: entry.date, entries: [] };
        const newHistory = { ...prev, [entry.date]: { ...current, entries: [...current.entries, entry] } };
        pushHistory(newHistory);
        return newHistory;
      });
    },
    [setHistory],
  );

  const removeEntry = useCallback(
    (entryId: string) => {
      setHistory((prev) => {
        const current    = prev[today] ?? { date: today, entries: [] };
        const newHistory = { ...prev, [today]: { ...current, entries: current.entries.filter((e) => e.id !== entryId) } };
        pushHistory(newHistory);
        return newHistory;
      });
    },
    [setHistory, today],
  );

  // ── Edit / remove any historical entry ─────────────────────────────────────

  const updateEntry = useCallback(
    (date: string, entryId: string, updates: Partial<Pick<MacroEntry, 'name' | 'calories' | 'protein' | 'carbs' | 'fat'>>) => {
      setHistory((prev) => {
        const log        = prev[date] ?? { date, entries: [] };
        const newHistory = {
          ...prev,
          [date]: { ...log, entries: log.entries.map((e) => e.id === entryId ? { ...e, ...updates } : e) },
        };
        pushHistory(newHistory);
        return newHistory;
      });
    },
    [setHistory],
  );

  const removeHistoryEntry = useCallback(
    (date: string, entryId: string) => {
      setHistory((prev) => {
        const log        = prev[date] ?? { date, entries: [] };
        const newHistory = {
          ...prev,
          [date]: { ...log, entries: log.entries.filter((e) => e.id !== entryId) },
        };
        pushHistory(newHistory);
        return newHistory;
      });
    },
    [setHistory],
  );

  // ── Goals ───────────────────────────────────────────────────────────────────

  const updateGoals = useCallback(
    (newGoals: CalorieGoals) => {
      setGoals(newGoals);
      const u = userRef.current;
      if (!u) return;
      void supabase.from('calorie_settings')
        .upsert({ user_id: u.id, daily_target: newGoals.calories, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .then(undefined, () => {});
    },
    [setGoals],
  );

  // ── Cross-screen sync ───────────────────────────────────────────────────────
  // Called on screen focus to sync state written by result/settings screens

  const reloadHistory = useCallback(async () => {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (raw) setHistory(JSON.parse(raw) as CalorieHistory);
  }, [setHistory]);

  const reloadGoals = useCallback(async () => {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    if (raw) setGoals(JSON.parse(raw) as CalorieGoals);
  }, [setGoals]);

  return {
    history,
    todayLog,
    goals,
    loaded: historyLoaded && goalsLoaded,
    addEntry,
    removeEntry,
    updateEntry,
    removeHistoryEntry,
    updateGoals,
    reloadHistory,
    reloadGoals,
  };
}
