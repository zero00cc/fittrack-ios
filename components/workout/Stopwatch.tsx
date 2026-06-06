import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  onClose: () => void;
}

function fmt(ms: number): string {
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return (
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0') + '.' +
    String(cs).padStart(2, '0')
  );
}

export function Stopwatch({ onClose }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef   = useRef<number | null>(null);
  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  function start() {
    startRef.current = Date.now() - elapsed;
    tickRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current!);
    }, 50);
    setRunning(true);
  }

  function pause() {
    if (tickRef.current) clearInterval(tickRef.current);
    setRunning(false);
  }

  function reset() {
    if (tickRef.current) clearInterval(tickRef.current);
    setRunning(false);
    setElapsed(0);
    startRef.current = null;
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={handleClose} style={styles.exitBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Stopwatch</Text>
      <Text style={styles.timer}>{fmt(elapsed)}</Text>

      <View style={styles.btnRow}>
        <TouchableOpacity onPress={reset} style={styles.resetBtn}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={running ? pause : start}
          style={[styles.startBtn, running && styles.pauseBtn]}
        >
          <Text style={styles.startBtnText}>{running ? 'Pause' : 'Start'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  exitBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  exitText: { fontSize: 13, color: '#6b7280', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#9ca3af', textAlign: 'center', marginBottom: 6 },
  timer: {
    fontSize: 54,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 28,
  },
  btnRow: { flexDirection: 'row', gap: 12 },
  resetBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  resetBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  startBtn: { flex: 1, backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  pauseBtn: { backgroundColor: '#f59e0b' },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
