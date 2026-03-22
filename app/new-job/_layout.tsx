import { Stack } from 'expo-router';

export default function NewJobLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1a56db',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="vin-scan" options={{ title: 'VIN Scan' }} />
      <Stack.Screen name="exterior-sweep" options={{ title: 'Exterior Sweep' }} />
      <Stack.Screen name="damage-analysis" options={{ title: 'Damage Analysis' }} />
      <Stack.Screen name="report" options={{ title: 'Report' }} />
    </Stack>
  );
}
