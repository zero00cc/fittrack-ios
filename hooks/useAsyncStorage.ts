import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAsyncStorage<T>(
  key: string,
  defaultValue: T,
): [T, (updater: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw !== null) setValue(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [key]);

  // Accepts either a plain value or a functional updater (prev => next).
  // Always writes the resolved value to AsyncStorage.
  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: T) => T)(prev)
            : updater;
        AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [key],
  );

  return [value, set, loaded];
}
