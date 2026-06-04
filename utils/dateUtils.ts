export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayYMD(): string {
  return toYMD(new Date());
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

export function getLast30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toYMD(d));
  }
  return days;
}

export function getLast90Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toYMD(d));
  }
  return days;
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function isoToDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Returns the Monday (YYYY-MM-DD) of the calendar week containing dateStr.
export function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun
  const daysToMonday = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + daysToMonday);
  return toYMD(d);
}

// Returns the absolute dates for `count` consecutive training days starting from
// the first occurrence of any day in weeklySchedule on or after startDate.
// weeklySchedule uses JS Date.getDay() values (0=Sun … 6=Sat).
export function getTrainingDates(
  startDate: string,
  weeklySchedule: number[],
  count: number,
): string[] {
  if (weeklySchedule.length === 0 || count === 0) return [];
  const sorted = new Set(weeklySchedule);
  const dates: string[] = [];
  const cursor = new Date(startDate + 'T00:00:00');
  while (dates.length < count) {
    if (sorted.has(cursor.getDay())) dates.push(toYMD(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
