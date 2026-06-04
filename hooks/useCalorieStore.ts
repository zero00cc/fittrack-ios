import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import { CalorieHistory, CalorieSettings, DailyLog, MealEntry } from '../types/calorie.types';
import { todayYMD } from '../utils/dateUtils';

const HISTORY_KEY = 'fittrack_calorie_history';
const SETTINGS_KEY = 'fittrack_calorie_settings';

const defaultHistory: CalorieHistory = {};
const defaultSettings: CalorieSettings = { dailyTarget: 2000 };

export function useCalorieStore() {
  const [history, setHistory, historyLoaded] = useAsyncStorage<CalorieHistory>(HISTORY_KEY, defaultHistory);
  const [settings, setSettings, settingsLoaded] = useAsyncStorage<CalorieSettings>(SETTINGS_KEY, defaultSettings);

  const today = todayYMD();
  const todayLog: DailyLog = history[today] ?? { date: today, entries: [] };

  const addEntry = useCallback(
    (entry: MealEntry) => {
      const current = history[today] ?? { date: today, entries: [] };
      setHistory({
        ...history,
        [today]: { ...current, entries: [...current.entries, entry] },
      });
    },
    [history, setHistory, today],
  );

  const removeEntry = useCallback(
    (entryId: string) => {
      const current = history[today] ?? { date: today, entries: [] };
      setHistory({
        ...history,
        [today]: { ...current, entries: current.entries.filter((e) => e.id !== entryId) },
      });
    },
    [history, setHistory, today],
  );

  const setTarget = useCallback(
    (target: number) => setSettings({ ...settings, dailyTarget: target }),
    [settings, setSettings],
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
