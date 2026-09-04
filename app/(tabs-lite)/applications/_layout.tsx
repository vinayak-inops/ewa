import { Stack } from 'expo-router';

export default function ApplicationsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="leave-application/index" />
      <Stack.Screen name="shift-change/index" />
      <Stack.Screen name="punch-application/index" />
      <Stack.Screen name="wfh-application/index" />
      <Stack.Screen name="ot-application/index" />
      <Stack.Screen name="out-duty-application/index" />
      <Stack.Screen name="compoff-application/index" />
      <Stack.Screen name="encashment-application/index" />
      <Stack.Screen name="edit-punch/index" />
    </Stack>
  );
}
