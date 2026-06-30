import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

export interface AnalyzedItem {
  name:     string;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
}

export interface AnalysisResult {
  description: string;
  items:       AnalyzedItem[];
}

// On web, expo-file-system stubs throw when called — use fetch + FileReader instead.
async function imageToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const res  = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

export async function analyzeFood(imageUri: string, mimeType = 'image/jpeg'): Promise<AnalysisResult> {
  const imageBase64 = await imageToBase64(imageUri);

  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { imageBase64, mimeType },
  });

  if (error) {
    // Try to surface the specific error message from the response body (e.g. rate limit)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await (error as any).context?.json?.().catch(() => null);
    throw new Error(body?.error ?? error.message);
  }

  return data as AnalysisResult;
}
