import { CalorieGoals, CalorieHistory } from '../types/calorie.types';
import { UserProfile, ACTIVITY_OPTIONS, GOAL_OPTIONS } from './nutritionCalc';
import { dayTotals } from './calorieUtils';
import { getLast30Days } from './dateUtils';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';
const MODEL   = 'claude-haiku-4-5-20251001';

export type ReportType = 'week' | 'month';

type WeightLog = Record<string, number>;

export async function generateReport(
  type: ReportType,
  profile: UserProfile,
  goals: CalorieGoals,
  history: CalorieHistory,
  weightLog: WeightLog,
): Promise<string> {
  const allDays = getLast30Days();
  const days    = type === 'week' ? allDays.slice(-7) : allDays;

  const activityLabel = ACTIVITY_OPTIONS.find(a => a.id === profile.activityLevel)?.label ?? profile.activityLevel;
  const goalLabel     = GOAL_OPTIONS.find(g => g.id === profile.goal)?.label ?? profile.goal;

  const dailyData = days.map(date => {
    const log = history[date] ?? { date, entries: [] };
    const t   = dayTotals(log);
    return {
      date,
      calories: t.calories,
      protein:  t.protein,
      carbs:    t.carbs,
      fat:      t.fat,
      logged:   log.entries.length > 0,
      weight:   weightLog[date] ?? null,
    };
  });

  const loggedDays    = dailyData.filter(d => d.logged);
  const weightEntries = dailyData.filter(d => d.weight !== null);

  const avgCalories = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length)
    : 0;
  const avgProtein = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length)
    : 0;
  const avgCarbs = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.carbs, 0) / loggedDays.length)
    : 0;
  const avgFat = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.fat, 0) / loggedDays.length)
    : 0;

  const weightSorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const firstWeight  = weightSorted[0]?.weight ?? null;
  const lastWeight   = weightSorted[weightSorted.length - 1]?.weight ?? null;
  const weightChange = firstWeight !== null && lastWeight !== null
    ? +(lastWeight - firstWeight).toFixed(1)
    : null;

  const prompt = `You are a certified personal trainer and nutritionist. Write a ${type === 'week' ? '7-day' : '30-day'} fitness report.

USER PROFILE:
Sex: ${profile.sex === 'male' ? 'Male' : 'Female'} | Age: ${profile.age} | Weight: ${profile.weightKg}kg | Height: ${profile.heightCm}cm
Activity: ${activityLabel} | Goal: ${goalLabel}

DAILY TARGETS: ${goals.calories} kcal | Protein ${goals.protein}g | Carbs ${goals.carbs}g | Fat ${goals.fat}g

PERIOD SUMMARY (${days.length} days):
- Logged days: ${loggedDays.length} of ${days.length}
- Average on logged days: ${avgCalories} kcal | P ${avgProtein}g | C ${avgCarbs}g | F ${avgFat}g
${weightEntries.length >= 2
  ? `- Weight change: ${firstWeight}kg to ${lastWeight}kg (${weightChange !== null && weightChange > 0 ? '+' : ''}${weightChange}kg)`
  : weightEntries.length === 1
    ? `- Weight recorded: ${lastWeight}kg (1 entry)`
    : '- No weight entries recorded'}

DAILY LOG:
${dailyData.map(d =>
  d.logged
    ? `${d.date}: ${d.calories}kcal P${d.protein}g C${d.carbs}g F${d.fat}g${d.weight ? ` | ${d.weight}kg` : ''}`
    : `${d.date}: not logged${d.weight ? ` | ${d.weight}kg` : ''}`
).join('\n')}

Write the report in plain text only — no markdown, no asterisks, no # symbols. Use UPPERCASE for section headings. Use a dash and space ("- ") for bullet points.

Structure the report with these sections:
OVERVIEW
CALORIE ANALYSIS
MACRO BREAKDOWN
WEIGHT PROGRESS (skip this section entirely if fewer than 2 weight entries)
RECOMMENDATIONS

Under RECOMMENDATIONS, give 3-5 specific, actionable tips directly related to the user's goal (${goalLabel}). Reference their actual numbers.

Keep it concise, encouraging, and data-driven.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                              'application/json',
      'x-api-key':                                 API_KEY,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message ?? `Server error ${res.status}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text ?? '').trim();
}
