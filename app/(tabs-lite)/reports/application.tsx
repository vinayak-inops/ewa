import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import ReportInfoSection from './_components/report-info-section';

export default function ReportApplicationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <View style={{ flex: 1 }}>
      <ReportInfoSection fileId={id ?? ''} />
    </View>
  );
}
