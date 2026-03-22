import { Stack } from 'expo-router';

export default function JobLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1a56db',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Job Detail' }} />
    </Stack>
  );
}
