import { View, Text } from 'react-native';

const SEGMENTS = 72; // 5° each — smooth enough without SVG

interface Props {
  current:  number;
  goal:     number;
  color:    string;
  size?:    number;
}

export function DonutRing({ current, goal, color, size = 190 }: Props) {
  const thickness   = Math.round(size * 0.10);
  const r           = (size - thickness) / 2;
  const pct         = goal > 0 ? Math.min(1, current / goal) : 0;
  const activeCount = Math.round(pct * SEGMENTS);
  const segW        = Math.max(3, Math.round(size * 0.020));
  const segH        = thickness + 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Ring segments — positioned with trig, rotated to face outward */}
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const angle = (i / SEGMENTS) * 2 * Math.PI; // 0 = 12-o'clock
        const cx    = size / 2 + r * Math.sin(angle);
        const cy    = size / 2 - r * Math.cos(angle);
        return (
          <View
            key={i}
            style={{
              position:        'absolute',
              width:           segW,
              height:          segH,
              backgroundColor: i < activeCount ? color : '#1e293b',
              borderRadius:    segW / 2,
              top:             cy - segH / 2,
              left:            cx - segW / 2,
              transform:       [{ rotate: `${(i / SEGMENTS) * 360}deg` }],
            }}
          />
        );
      })}

      {/* Center content */}
      <View style={{ alignItems: 'center', gap: 1 }}>
        <Text style={{ fontSize: size * 0.195, fontWeight: '900', color, letterSpacing: -1, lineHeight: size * 0.22 }}>
          {current > 9999 ? `${(current / 1000).toFixed(1)}k` : current.toLocaleString()}
        </Text>
        <Text style={{ fontSize: size * 0.063, color: '#64748b', fontWeight: '600' }}>kcal eaten</Text>
        <Text style={{ fontSize: size * 0.057, color: '#475569' }}>
          {goal - current >= 0 ? `${(goal - current).toLocaleString()} left` : `${(current - goal).toLocaleString()} over`}
        </Text>
      </View>
    </View>
  );
}
