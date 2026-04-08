import { StyleSheet, Text, View } from 'react-native';

export default function RichFormScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Form (Rich)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
