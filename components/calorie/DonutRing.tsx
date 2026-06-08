import { View, Text } from 'react-native';
import { SERIF, TEXT, MUTED, DIM, BORDER } from '../../constants/theme';

const SEGMENTS = 72;

interface Props {
  current:     number;
  goal:        number;
  color:       string;
  size?:       number;
  showCenter?: boolean;
  label?:      string;
}

export function DonutRing({ current, goal, color, size = 190, showCenter = true, label }: Props) {
  const thickness   = Math.round(size * 0.10);
  const r           = (size - thickness) / 2;
  const pct         = goal > 0 ? Math.min(1, current / goal) : 0;
  const activeCount = Math.round(pct * SEGMENTS);
  const segW        = Math.max(3, Math.round(size * 0.020));
  const segH        = thickness + 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const angle = (i / SEGMENTS) * 2 * Math.PI;
        const cx    = size / 2 + r * Math.sin(angle);
        const cy    = size / 2 - r * Math.cos(angle);
        return (
          <View
            key={i}
            style={{
              position:        'absolute',
              width:           segW,
              height:          segH,
              backgroundColor: i < activeCount ? color : BORDER,
              borderRadius:    segW / 2,
              top:             cy - segH / 2,
              left:            cx - segW / 2,
              transform:       [{ rotate: `${(i / SEGMENTS) * 360}deg` }],
            }}
          />
        );
      })}

      {showCenter && (
        <View style={{ alignItems: 'center' }}>
          {label ? (
            // ── Macro ring ────────────────────────────────────────────────────
            <>
              <Text style={{ fontSize: size * 0.20, fontWeight: '900', color, letterSpacing: -0.5, lineHeight: size * 0.23, fontFamily: SERIF }}>
                {current}
              </Text>
              <Text style={{ fontSize: size * 0.095, color: TEXT, fontWeight: '700', letterSpacing: 0.2, marginTop: 1, fontFamily: SERIF }}>
                g · {label}
              </Text>
              <Text style={{ fontSize: size * 0.082, color: DIM, marginTop: 2 }}>
                / {goal}g
              </Text>
            </>
          ) : (
            // ── Calorie ring ──────────────────────────────────────────────────
            <>
              <Text style={{ fontSize: size * 0.195, fontWeight: '900', color, letterSpacing: -1, lineHeight: size * 0.22, fontFamily: SERIF }}>
                {current > 9999 ? `${(current / 1000).toFixed(1)}k` : current.toLocaleString()}
              </Text>
              <Text style={{ fontSize: size * 0.063, color: MUTED, fontWeight: '600', marginTop: 2 }}>
                kcal eaten
              </Text>
              <Text style={{ fontSize: size * 0.057, color: DIM, marginTop: 1 }}>
                {goal - current >= 0
                  ? `${(goal - current).toLocaleString()} left`
                  : `${(current - goal).toLocaleString()} over`}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}
