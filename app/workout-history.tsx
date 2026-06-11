import { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { PersonalRecord } from '../types/workout.types';
import { isoToDisplay, todayYMD, getLast90Days, getLast30Days, formatShortDate } from '../utils/dateUtils';
import { generateId } from '../utils/calorieUtils';
import {
  BG, CARD, BORDER, TEXT, MUTED, DIM, ACCENT, ACCENT_MID, SERIF,
} from '../constants/theme';

const SQUAT_C = '#ef4444';
const BENCH_C = '#3b82f6';
const DL_C    = '#a855f7';

const DOW    = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August',
                'September','October','November','December'];

// ── Activity Calendar ─────────────────────────────────────────────────────────

function ActivityCalendar({
  workoutDates,
  prDates,
}: {
  workoutDates: Record<string, 'done' | 'skipped'>;
  prDates: Set<string>;
}) {
  const today = todayYMD();
  const [year, setYear]   = useState(() => parseInt(today.slice(0, 4), 10));
  const [month, setMonth] = useState(() => parseInt(today.slice(5, 7), 10) - 1);

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const flat: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (flat.length % 7 !== 0) flat.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < flat.length; i += 7) rows.push(flat.slice(i, i + 7));

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <View style={cal.container}>
      {/* Month nav */}
      <View style={cal.nav}>
        <TouchableOpacity
          onPress={() => month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={cal.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity
          onPress={() => month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={cal.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={cal.row}>
        {DOW.map(d => <View key={d} style={cal.cell}><Text style={cal.dowLabel}>{d}</Text></View>)}
      </View>

      {/* Date rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={cal.row}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={cal.cell} />;
            const dateYMD = `${year}-${pad(month + 1)}-${pad(day)}`;
            const isToday = dateYMD === today;
            const status  = workoutDates[dateYMD];
            const hasPR   = prDates.has(dateYMD);

            const bg = status === 'done' ? '#10b981' : status === 'skipped' ? '#f59e0b' : 'transparent';
            const fg = status ? '#fff' : isToday ? '#6366f1' : TEXT;

            return (
              <View key={dateYMD} style={cal.cell}>
                <View style={[cal.circle, { backgroundColor: bg }, isToday && !status && cal.circleToday]}>
                  <Text style={[cal.dayNum, { color: fg }]}>{day}</Text>
                </View>
                {hasPR && <View style={cal.prStar} />}
              </View>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={cal.legend}>
        {([
          ['#10b981', 'Done'],
          ['#f59e0b', 'Skipped'],
          [ACCENT,    'PR day'],
        ] as [string, string][]).map(([c, label]) => (
          <View key={label} style={cal.legendItem}>
            <View style={[cal.legendDot, { backgroundColor: c }]} />
            <Text style={cal.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const CIRCLE = 32;
const cal = StyleSheet.create({
  container:  { backgroundColor: CARD, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BORDER },
  nav:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  navArrow:   { fontSize: 22, fontWeight: '600', color: TEXT, lineHeight: 26 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  row:        { flexDirection: 'row' },
  cell:       { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  dowLabel:   { fontSize: 10, fontWeight: '600', color: MUTED },
  circle:     { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  circleToday:{ borderWidth: 2, borderColor: '#6366f1' },
  dayNum:     { fontSize: 12, fontWeight: '600' },
  prStar:     { width: 5, height: 5, borderRadius: 2.5, backgroundColor: ACCENT, marginTop: 1 },
  legend:     { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 7, height: 7, borderRadius: 3.5 },
  legendLabel:{ fontSize: 10, color: MUTED },
});

// ── PR Line Chart ─────────────────────────────────────────────────────────────

const CHART_H = 130;
const Y_W     = 40;
const X_H     = 22;
const W_SLOT  = 16;

function LineSeg({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const dx  = x2 - x1; const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ang = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View style={{
      position: 'absolute',
      width: len, height: 2, backgroundColor: color, borderRadius: 1,
      top: (y1 + y2) / 2 - 1, left: (x1 + x2) / 2 - len / 2,
      transform: [{ rotate: `${ang}deg` }],
    }} />
  );
}

function PRChart({ prLog }: { prLog: PersonalRecord[] }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: false }); }, []);

  const days = getLast90Days();

  // Latest entry per date
  const dateMap: Record<string, PersonalRecord> = {};
  for (const pr of [...prLog].reverse()) dateMap[pr.date] = pr;

  const sqVals  = days.map(d => dateMap[d]?.squat    ?? null);
  const bpVals  = days.map(d => dateMap[d]?.bench    ?? null);
  const dlVals  = days.map(d => dateMap[d]?.deadlift ?? null);
  const all     = [...sqVals, ...bpVals, ...dlVals].filter((v): v is number => v !== null);

  if (all.length === 0) {
    return (
      <View style={ch.wrap}>
        <Text style={ch.title}>Personal Records</Text>
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Text style={{ fontSize: 13, color: MUTED }}>No PRs logged yet.</Text>
          <Text style={{ fontSize: 11, color: DIM, marginTop: 4 }}>Log your lifts when starting a plan.</Text>
        </View>
      </View>
    );
  }

  const lo  = Math.max(0, Math.min(...all) - 5);
  const hi  = Math.max(...all) + 5;
  const rng = Math.max(hi - lo, 1);
  const toY = (v: number) => CHART_H - ((v - lo) / rng) * CHART_H;

  function buildPts(vals: (number | null)[]) {
    return days.map((d, i) => {
      const v = vals[i];
      return v !== null ? { x: i * W_SLOT + W_SLOT / 2, y: toY(v), v } : null;
    });
  }

  function renderSeries(pts: ReturnType<typeof buildPts>, color: string) {
    return (
      <>
        {pts.map((pt, i) => {
          if (!pt) return null;
          const next = pts.slice(i + 1).find(p => p !== null);
          if (!next) return null;
          return <LineSeg key={`l${i}`} x1={pt.x} y1={pt.y} x2={next.x} y2={next.y} color={color} />;
        })}
        {pts.map((pt, i) => {
          if (!pt) return null;
          return (
            <View key={`d${i}`} style={{
              position: 'absolute', width: 7, height: 7, borderRadius: 3.5,
              backgroundColor: color, top: pt.y - 3.5, left: pt.x - 3.5,
            }} />
          );
        })}
      </>
    );
  }

  // Y-axis ticks
  const roughStep = (hi - lo) / 4;
  const mag   = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const step  = Math.ceil(roughStep / mag) * mag;
  const first = Math.ceil(lo / step) * step;
  const yTicks = Array.from({ length: Math.ceil((hi - first) / step) + 1 }, (_, i) => first + i * step)
    .filter(t => t >= lo && t <= hi);

  return (
    <View style={ch.wrap}>
      <Text style={ch.title}>Personal Records — 90 days</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Y axis */}
        <View style={{ width: Y_W }}>
          <View style={{ height: CHART_H, position: 'relative' }}>
            {yTicks.map(t => (
              <Text key={t} style={{
                position: 'absolute', right: 4, fontSize: 9, color: MUTED, fontWeight: '600',
                bottom: Math.max(0, Math.round(((t - lo) / rng) * CHART_H) - 6),
              }}>
                {Math.round(t)}
              </Text>
            ))}
          </View>
          <View style={{ height: X_H }} />
        </View>
        {/* Chart area */}
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ width: days.length * W_SLOT, height: CHART_H + X_H }}>
            <View style={{ height: CHART_H, position: 'relative' }}>
              {renderSeries(buildPts(sqVals), SQUAT_C)}
              {renderSeries(buildPts(bpVals), BENCH_C)}
              {renderSeries(buildPts(dlVals), DL_C)}
            </View>
            <View style={{ height: X_H, flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER }}>
              {days.map((d, i) => {
                if (i % 15 !== 0) return null;
                const dt  = new Date(d + 'T00:00:00');
                const lbl = `${dt.toLocaleDateString('en-US', { month: 'short' })} ${dt.getDate()}`;
                return (
                  <View key={d} style={{ width: W_SLOT * 15, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, color: MUTED, fontWeight: '600' }}>{lbl}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
      <View style={ch.legend}>
        {([
          [SQUAT_C, 'Squat'],
          [BENCH_C, 'Bench'],
          [DL_C,    'Deadlift'],
        ] as [string, string][]).map(([c, l]) => (
          <View key={l} style={ch.legendItem}>
            <View style={[ch.legendDot, { backgroundColor: c }]} />
            <Text style={ch.legendTxt}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ch = StyleSheet.create({
  wrap:       { backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, gap: 10 },
  title:      { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 7, height: 7, borderRadius: 3.5 },
  legendTxt:  { fontSize: 10, color: MUTED },
});

// ── Screen ────────────────────────────────────────────────────────────────────

const STATUS_COLORS = { finished: '#10b981', skipped: '#f59e0b', unfinished: '#9ca3af' };
const STATUS_LABELS = { finished: '✓ Done', skipped: '– Skipped', unfinished: 'Pending' };
const LEVEL_LABELS  = { beginner: 'Beginner', intermediate: 'Intermediate', professional: 'Professional', personalized: 'Custom' };

export default function WorkoutHistoryScreen() {
  const { workoutState, recordPR, updatePR, deletePR } = useWorkoutStore();

  const prLog = workoutState.prLog ?? [];

  // ── PR edit modal state ──────────────────────────────────────────
  const [editingPR,  setEditingPR]  = useState<PersonalRecord | null>(null);
  const [isNewPR,    setIsNewPR]    = useState(false);
  const [editDate,   setEditDate]   = useState(todayYMD());
  const [editSquat,  setEditSquat]  = useState('');
  const [editBench,  setEditBench]  = useState('');
  const [editDL,     setEditDL]     = useState('');

  function openEdit(pr: PersonalRecord) {
    setEditingPR(pr);
    setIsNewPR(false);
    setEditDate(pr.date);
    setEditSquat(pr.squat    != null ? String(pr.squat)    : '');
    setEditBench(pr.bench    != null ? String(pr.bench)    : '');
    setEditDL   (pr.deadlift != null ? String(pr.deadlift) : '');
  }

  function openNew() {
    const blank: PersonalRecord = { id: generateId(), date: todayYMD(), squat: null, bench: null, deadlift: null };
    setEditingPR(blank);
    setIsNewPR(true);
    setEditDate(todayYMD());
    setEditSquat(''); setEditBench(''); setEditDL('');
  }

  function closeEdit() { setEditingPR(null); }

  function saveEdit() {
    if (!editingPR) return;
    const updated: PersonalRecord = {
      ...editingPR,
      date:     editDate,
      squat:    parseFloat(editSquat)  || null,
      bench:    parseFloat(editBench)  || null,
      deadlift: parseFloat(editDL)     || null,
    };
    if (isNewPR) recordPR(updated);
    else         updatePR(updated);
    closeEdit();
  }

  function confirmDelete() {
    if (!editingPR) return;
    deletePR(editingPR.id);
    closeEdit();
  }

  // Build activity date map from all plan history + current progress
  const workoutDates = useMemo<Record<string, 'done' | 'skipped'>>(() => {
    const map: Record<string, 'done' | 'skipped'> = {};
    for (const plan of workoutState.planHistory ?? []) {
      for (const dr of plan.dayResults) {
        if (dr.completionDate && dr.status !== 'unfinished') {
          map[dr.completionDate] = dr.status === 'finished' ? 'done' : 'skipped';
        }
      }
    }
    if (workoutState.progress?.completionDates) {
      for (const [dn, date] of Object.entries(workoutState.progress.completionDates)) {
        const st = workoutState.progress.dayStatus[parseInt(dn, 10)];
        map[date] = st === 'skipped' ? 'skipped' : 'done';
      }
    }
    return map;
  }, [workoutState.planHistory, workoutState.progress]);

  // Dates where a PR was logged
  const prDates = useMemo(() => new Set(prLog.map(p => p.date)), [prLog]);

  const history = workoutState.planHistory ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Activity Calendar */}
        <Text style={s.sectionHeader}>Workout Activity</Text>
        <ActivityCalendar workoutDates={workoutDates} prDates={prDates} />

        {/* PR Chart */}
        <Text style={s.sectionHeader}>Strength Progress</Text>
        <PRChart prLog={prLog} />

        {/* PR Log */}
        <View style={s.prLogHeader}>
          <Text style={s.sectionHeader}>PR Log</Text>
          <TouchableOpacity style={s.addPRBtn} onPress={openNew}>
            <Text style={s.addPRText}>+ Log PR</Text>
          </TouchableOpacity>
        </View>
        {prLog.length === 0 ? (
          <TouchableOpacity style={s.emptyCard} onPress={openNew} activeOpacity={0.7}>
            <Text style={s.emptyText}>No PRs logged yet</Text>
            <Text style={[s.emptyText, { fontSize: 11, marginTop: 3 }]}>Tap to add your first entry</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.prLogCard}>
            {prLog.map((pr, idx) => (
              <TouchableOpacity
                key={pr.id}
                style={[s.prRow, idx < prLog.length - 1 && s.prRowBorder]}
                onPress={() => openEdit(pr)}
                activeOpacity={0.7}
              >
                <Text style={s.prDate}>{isoToDisplay(pr.date)}</Text>
                <View style={s.prValues}>
                  {pr.squat    !== null && <Text style={[s.prVal, { color: SQUAT_C }]}>SQ {pr.squat}kg</Text>}
                  {pr.bench    !== null && <Text style={[s.prVal, { color: BENCH_C }]}>BP {pr.bench}kg</Text>}
                  {pr.deadlift !== null && <Text style={[s.prVal, { color: DL_C    }]}>DL {pr.deadlift}kg</Text>}
                </View>
                <Text style={s.prChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* PR Edit Modal */}
        {editingPR && (
          <Modal visible transparent animationType="slide">
            <SafeAreaView style={s.modalSafe} edges={['bottom']}>
              <View style={s.modalOverlay}>
                <View style={s.modalCard}>
                  <View style={s.modalTopRow}>
                    <Text style={s.modalTitle}>{isNewPR ? 'Log New PR' : 'Edit PR'}</Text>
                    <TouchableOpacity onPress={closeEdit}>
                      <Text style={s.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Date picker */}
                  <Text style={s.modalLabel}>Date</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.datePicker}
                  >
                    {getLast30Days().reverse().map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[s.datePill, editDate === d && s.datePillOn]}
                        onPress={() => setEditDate(d)}
                      >
                        <Text style={[s.datePillTxt, editDate === d && s.datePillTxtOn]}>
                          {formatShortDate(d)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Lift inputs */}
                  {([
                    { label: 'Squat',       color: SQUAT_C, val: editSquat, set: setEditSquat },
                    { label: 'Bench Press', color: BENCH_C, val: editBench, set: setEditBench },
                    { label: 'Deadlift',    color: DL_C,    val: editDL,    set: setEditDL    },
                  ] as const).map(({ label, color, val, set }) => (
                    <View key={label} style={s.liftRow}>
                      <View style={[s.liftBar, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.liftLabel}>{label}</Text>
                        <View style={s.liftInputRow}>
                          <TextInput
                            style={[s.liftInput, { color }]}
                            value={val}
                            onChangeText={set as (v: string) => void}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor={MUTED}
                            selectTextOnFocus
                          />
                          <Text style={s.liftUnit}>kg</Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Actions */}
                  <TouchableOpacity style={s.saveBtn} onPress={saveEdit}>
                    <Text style={s.saveBtnTxt}>Save</Text>
                  </TouchableOpacity>
                  {!isNewPR && (
                    <TouchableOpacity style={s.deleteBtn} onPress={confirmDelete}>
                      <Text style={s.deleteBtnTxt}>Delete Entry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SafeAreaView>
          </Modal>
        )}

        {/* Completed Plans */}
        <Text style={s.sectionHeader}>Completed Plans ({history.length})</Text>
        {history.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No completed plans yet.</Text>
          </View>
        ) : (
          history.map((record) => {
            const pct  = record.totalDays > 0 ? Math.round((record.finishedDays / record.totalDays) * 100) : 0;
            const bar  = Math.max(0, Math.min(100, pct));
            return (
              <View key={record.id} style={s.planCard}>
                <View style={s.planCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.planName}>{record.planName}</Text>
                    <Text style={s.planLevel}>{LEVEL_LABELS[record.level] ?? record.level}</Text>
                    <Text style={s.planDates}>
                      {isoToDisplay(record.startDate)} → {isoToDisplay(record.completedDate)}
                    </Text>
                  </View>
                  <View style={s.planBadge}>
                    <Text style={s.planBadgeNum}>{pct}%</Text>
                    <Text style={s.planBadgeLbl}>done</Text>
                  </View>
                </View>
                {/* Progress bar */}
                <View style={s.planBar}>
                  <View style={[s.planBarFill, { width: `${bar}%` as any }]} />
                </View>
                {/* Day results */}
                <View style={s.dayList}>
                  {record.dayResults.map((dr) => (
                    <View key={dr.dayNumber} style={s.dayRow}>
                      <View style={[s.dayDot, { backgroundColor: STATUS_COLORS[dr.status] }]} />
                      <Text style={s.dayLabel} numberOfLines={1}>{dr.label}</Text>
                      {dr.completionDate
                        ? <Text style={s.dayDate}>{isoToDisplay(dr.completionDate)}</Text>
                        : <Text style={[s.dayDate, { color: STATUS_COLORS[dr.status] }]}>{STATUS_LABELS[dr.status]}</Text>
                      }
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: BG },
  scroll:        { padding: 14, gap: 10, paddingBottom: 28 },
  sectionHeader: { fontSize: 10, fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.9, marginTop: 6 },

  // PR log
  prLogHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addPRBtn:      { backgroundColor: CARD, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: BORDER },
  addPRText:     { fontSize: 12, fontWeight: '700', color: ACCENT },
  prLogCard:     { backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  prRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  prRowBorder:   { borderBottomWidth: 1, borderBottomColor: BORDER },
  prDate:        { fontSize: 12, fontWeight: '600', color: TEXT, flex: 1 },
  prValues:      { flexDirection: 'row', gap: 8 },
  prVal:         { fontSize: 11, fontWeight: '700' },
  prChevron:     { fontSize: 18, color: MUTED, marginLeft: 6 },
  // PR edit modal
  modalSafe:     { flex: 1 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, paddingBottom: 28 },
  modalTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:    { fontSize: 17, fontWeight: '800', color: TEXT, fontFamily: SERIF },
  modalClose:    { fontSize: 18, color: MUTED, paddingLeft: 16 },
  modalLabel:    { fontSize: 10, fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: -4 },
  datePicker:    { gap: 6, paddingVertical: 2 },
  datePill:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  datePillOn:    { backgroundColor: TEXT, borderColor: TEXT },
  datePillTxt:   { fontSize: 12, fontWeight: '600', color: MUTED },
  datePillTxtOn: { color: BG },
  liftRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 12, padding: 12 },
  liftBar:       { width: 4, height: 44, borderRadius: 2 },
  liftLabel:     { fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  liftInputRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  liftInput:     { fontSize: 26, fontWeight: '800', width: 100, fontFamily: SERIF },
  liftUnit:      { fontSize: 13, color: MUTED, fontWeight: '600' },
  saveBtn:       { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnTxt:    { color: BG, fontWeight: '700', fontSize: 15 },
  deleteBtn:     { paddingVertical: 10, alignItems: 'center' },
  deleteBtnTxt:  { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // Completed plan cards
  planCard:       { backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER, gap: 10 },
  planCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  planName:       { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: SERIF },
  planLevel:      { fontSize: 10, color: MUTED, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  planDates:      { fontSize: 11, color: DIM, marginTop: 3 },
  planBadge:      { alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  planBadgeNum:   { fontSize: 17, fontWeight: '800', color: '#10b981' },
  planBadgeLbl:   { fontSize: 9, color: MUTED },
  planBar:        { height: 4, backgroundColor: BORDER, borderRadius: 2, overflow: 'hidden' },
  planBarFill:    { height: 4, backgroundColor: '#10b981', borderRadius: 2 },
  dayList:        { gap: 5 },
  dayRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayDot:         { width: 6, height: 6, borderRadius: 3 },
  dayLabel:       { flex: 1, fontSize: 12, color: TEXT },
  dayDate:        { fontSize: 11, color: DIM },

  emptyCard:  { backgroundColor: CARD, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  emptyText:  { fontSize: 13, color: MUTED },
});
