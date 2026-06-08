import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function Icon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{label}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#FCFBEA' },
        headerTintColor: '#37260C',
        headerTitleStyle: { fontWeight: '700', color: '#37260C', fontFamily: 'Helvetica Neue' },
        tabBarActiveTintColor: '#37260C',
        tabBarInactiveTintColor: '#AD8D1A',
        tabBarStyle: { backgroundColor: '#FCFBEA', borderTopColor: '#E8D961' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'FitTrack',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <Icon label="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calories"
        options={{
          headerShown: false,
          tabBarLabel: 'Calories',
          tabBarIcon: ({ focused }) => <Icon label="🥗" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workout Plans',
          tabBarLabel: 'Workouts',
          tabBarIcon: ({ focused }) => <Icon label="🏋️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercise Library',
          tabBarLabel: 'Exercises',
          tabBarIcon: ({ focused }) => <Icon label="🎬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ focused }) => <Icon label="📸" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Leaderboard',
          tabBarLabel: 'Ranking',
          tabBarIcon: ({ focused }) => <Icon label="🏆" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
