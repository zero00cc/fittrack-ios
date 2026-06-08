import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAsyncStorage } from './useAsyncStorage';
import { CalorieHistory, CalorieGoals, MacroEntry } from '../types/calorie.types';
import { todayYMD } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const HISTORY_KEY = 'fittrack_calorie_history';
const GOALS_KEY   = 'fittrack_calorie_settings';
const WEIGHT_KEY  = 'fittrack_weight_log';

type WeightLog = Record<string, number>; // { 'YYYY-MM-DD': kg }

const defaultHistory:   CalorieHistory = {};
const defaultGoals:     CalorieGoals   = { calories: 2000, protein: 150, carbs: 200, fat: 65 };
const defaultWeightLog: WeightLog      = {};

export function useCalorieStore() {
  const { user } = useAuth();
  const userRef   = useRef(user);
  userRef.current = user;

  const [history,   setHistory,  historyLoaded] = useAsyncStorage<CalorieHistory>(HISTORY_KEY, defaultHistory);
  const [rawGoals,  setGoals,    goalsLoaded]   = useAsyncStorage<any>(GOALS_KEY, defaultGoals);
  const [weightLog, setWeightLog]               = useAsyncStorage<WeightLog>(WEIGHT_KEY, defaultWeightLog);

  // Normalise legacy { dailyTarget } format that existed before the macro rebuild.
  const goals: CalorieGoals = {
    ...defaultGoals,
    ...rawGoals,
    calories: rawGoals?.calories ?? (rawGoals as any)?.dailyTarget ?? defaultGoals.calories,
  };

  // ── Pull from Supabase on sign-in ───────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('calorie_history').select('data').eq('user_id', user.id).single(),
      supabase.from('calorie_settings')
        .select('daily_target, protein_target, carbs_target, fat_target')
        .eq('user_id', user.id).single(),
      supabase.from('weight_log').select('data').eq('user_id', user.id).single(),
    ]).then(([hRes, sRes, wRes]) => {
      if (hRes.data?.data) setHistory(hRes.data.data as CalorieHistory);
      if (sRes.data) {
        setGoals({
          calories: sRes.data.daily_target        ?? defaultGoals.calories,
          protein:  sRes.data.protein_target      ?? defaultGoals.protein,
          carbs:    sRes.data.carbs_target         ?? defaultGoals.carbs,
          fat:      sRes.data.fat_target           ?? defaultGoals.fat,
        });
      }
      if (wRes.data?.data) setWeightLog(wRes.data.data as WeightLog);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Supabase push helpers ───────────────────────────────────────────────────

  function pushHistory(h: CalorieHistory) {
    const u = userRef.current;
    if (!u) return;
    void supabase.from('calorie_history')
      .upsert({ user_id: u.id, data: h, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .then(undefined, () => {});
  }

  function pushWeightLog(w: WeightLog) {
    const u = userRef.current;
    if (!u) return;
    void supabase.from('weight_log')
      .upsert({ user_id: u.id, data: w, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .then(undefined, () => {});
  }

  // ── Calorie history mutations ───────────────────────────────────────────────

  const today = todayYMD();
  const todayLog = history[today] ?? { date: today, entries: [] };

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
        .upsert({
          user_id:         u.id,
          daily_target:    newGoals.calories,
          protein_target:  newGoals.protein,
          carbs_target:    newGoals.carbs,
          fat_target:      newGoals.fat,
          updated_at:      new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .then(undefined, () => {});
    },
    [setGoals],
  );

  // ── Weight log ──────────────────────────────────────────────────────────────

  const saveWeight = useCallback(
    (date: string, kg: number) => {
      setWeightLog((prev) => {
        const updated = { ...prev, [date]: kg };
        pushWeightLog(updated);
        return updated;
      });
    },
    [setWeightLog],
  );

  // ── Cross-screen sync ───────────────────────────────────────────────────────

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
    weightLog,
    loaded: historyLoaded && goalsLoaded,
    addEntry,
    removeEntry,
    updateEntry,
    removeHistoryEntry,
    updateGoals,
    saveWeight,
    reloadHistory,
    reloadGoals,
  };
}
