import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function RichLaunchpadScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Launchpad Rich</Text>
      <Text style={styles.subtitle}>Full feature navigation enabled.</Text>
      <Link href="/(tabs-rich)/form">Go to Form</Link>
      <Link href="/(tabs-rich)/history">Go to History</Link>
      <Link href="/(tabs-rich)/information">Go to Information</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#475569',
    textAlign: 'center',
  },
});
