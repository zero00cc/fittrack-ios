import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return <Ionicons name={name} size={24} color={focused ? '#37260C' : '#AD8D1A'} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#FCFBEA' },
        headerTintColor: '#37260C',
        headerTitleStyle: { fontWeight: '700', color: '#37260C' },
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
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calories"
        options={{
          headerShown: false,
          tabBarLabel: 'Calories',
          tabBarIcon: ({ focused }) => <TabIcon name="nutrition" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workout Plans',
          tabBarLabel: 'Workouts',
          tabBarIcon: ({ focused }) => <TabIcon name="barbell" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercise Library',
          tabBarLabel: 'Exercises',
          tabBarIcon: ({ focused }) => <TabIcon name="library" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ focused }) => <TabIcon name="images" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Leaderboard',
          tabBarLabel: 'Ranking',
          tabBarIcon: ({ focused }) => <TabIcon name="trophy" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
