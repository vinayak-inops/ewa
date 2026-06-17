import { useGetRequest } from '@/hooks/api/useGetRequest';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const APP_FONT_FAMILY = 'Inter';

type StatusTheme = {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  iconColor: string;
};

function getStatusTheme(status?: string): StatusTheme {
  const normalizedStatus = (status ?? '').toLowerCase();

  if (normalizedStatus.includes('approve') || normalizedStatus.includes('success') || normalizedStatus.includes('complete')) {
    return {
      borderColor: '#86efac',
      backgroundColor: '#f0fdf4',
      textColor: '#166534',
      iconColor: '#16a34a',
    };
  }

  if (normalizedStatus.includes('reject') || normalizedStatus.includes('fail') || normalizedStatus.includes('cancel')) {
    return {
      borderColor: '#fca5a5',
      backgroundColor: '#fef2f2',
      textColor: '#991b1b',
      iconColor: '#dc2626',
    };
  }

  if (normalizedStatus.includes('pending') || normalizedStatus.includes('review') || normalizedStatus.includes('progress')) {
    return {
      borderColor: '#fde68a',
      backgroundColor: '#fffbeb',
      textColor: '#92400e',
      iconColor: '#d97706',
    };
  }

  return {
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    textColor: '#334155',
    iconColor: '#475569',
  };
}

type AutoStatusUpdateProps = {
  fileId: string;
  onContinue: () => void;
  onClose: () => void;
};

export default function AutoStatusUpdate({
  fileId,
  onContinue,
  onClose,
}: AutoStatusUpdateProps) {
  const { data, loading, error,refetch } = useGetRequest<any[]>({
    url: `map/workflow_management/search?fileId=${fileId}`,
    method: 'GET',
    enabled: Boolean(fileId),
    dependencies: [fileId],
  });


  const steps = useMemo(() => (Array.isArray(data) ? data.slice(0, 7) : []), [data]);

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Status Updates</Text>
        </View>
      </View>

      {loading &&<Text style={styles.pending}>Loading status updates...</Text>}
      {!!error && <Text style={styles.error}>Failed to load status updates.</Text>}
      {!loading && !error && steps.length === 0 && <Text style={styles.pending}>Status is updating. Please wait...</Text>}

      {!loading && !error && steps.length > 0 && (
        <View style={styles.timelineWrap}>
          {steps.map((step: any, index: number) => {
            const isSuccess = step?.isSuccess === true || step?.isSuccess === 'true';
            const hasTime = Boolean(step?.timestamp) && !Number.isNaN(new Date(step.timestamp).getTime());
            const isLast = index === steps.length - 1;
            const statusTheme = getStatusTheme(step?.currentStatus);

            return (
              <View key={String(step?._id ?? index)} style={styles.row}>
                <View style={styles.rail}>
                  <View style={[styles.dot, isSuccess ? styles.dotSuccess : styles.dotPending]}>
                    <Ionicons name={isSuccess ? 'checkmark' : 'time-outline'} size={12} color="#fff" />
                  </View>
                  {!isLast && <View style={styles.connector} />}
                </View>
                <View
                  style={[
                    styles.itemCard,
                    !isSuccess && styles.itemCardPending,
                    { borderColor: statusTheme.borderColor, backgroundColor: statusTheme.backgroundColor },
                  ]}
                >
                  <View style={styles.itemHead}>
                    <Text style={[styles.step, { color: statusTheme.textColor }]}>{step?.currentStatus ?? 'Initiated'}</Text>
                    <Text style={styles.time}>{hasTime ? new Date(step.timestamp).toLocaleString('en-IN') : 'Updating...'}</Text>
                  </View>
                  <View style={styles.itemBody}>
                    <Ionicons name="document-text-outline" size={14} color={statusTheme.iconColor} />
                    <Text style={[styles.eventText, !isSuccess && styles.eventPending, { color: statusTheme.textColor }]}>
                      {step?.eventName ?? 'Workflow update'}
                    </Text>
                    {!!step?.performedBy && <Text style={styles.performedBy}>- {step.performedBy}</Text>}
                  </View>
                  {!!step?.eventMessage && <Text style={styles.message}>{step.eventMessage}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Pressable onPress={onClose}>
        <Text style={styles.link}>Back to Launchpad</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, borderRadius: 16, backgroundColor: '#fff', padding: 14, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',marginBottom: 8 },
  title: { fontFamily: APP_FONT_FAMILY, color: '#0f172a', fontSize: 18, fontWeight: '700' },
  subtitle: { fontFamily: APP_FONT_FAMILY, color: '#64748b', fontSize: 12 },
  badge: { borderRadius: 999, backgroundColor: '#13206b', paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: APP_FONT_FAMILY, fontSize: 12, fontWeight: '700', color: '#fff' },
  pending: { fontFamily: APP_FONT_FAMILY, color: '#64748b', fontSize: 12, marginTop: 4 },
  error: { fontFamily: APP_FONT_FAMILY, color: '#b91c1c', fontSize: 12, marginTop: 4 },
  summaryCard: { borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#f8fbff', padding: 10, gap: 10, marginBottom: 6 },
  summaryRefRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  summaryRefIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  summaryRefTextWrap: { flex: 1 },
  summaryRefLabel: { fontFamily: APP_FONT_FAMILY, fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  summaryRefValue: { fontFamily: APP_FONT_FAMILY, marginTop: 2, fontSize: 13, fontWeight: '800', color: '#0f172a' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  summaryGridItem: { width: '50%', paddingRight: 8 },
  summaryGridLabel: { fontFamily: APP_FONT_FAMILY, fontSize: 10, color: '#94a3b8', marginBottom: 3 },
  summaryGridValue: { fontFamily: APP_FONT_FAMILY, fontSize: 12, fontWeight: '700', color: '#0f172a' },
  timelineWrap: { marginTop: 4, paddingLeft: 4 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  rail: { width: 18, alignItems: 'center', position: 'relative', alignSelf: 'stretch' },
  dot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  dotSuccess: { backgroundColor: '#22c55e' },
  dotPending: { backgroundColor: '#f59e0b' },
  connector: { position: 'absolute', top: 18, bottom: -8, width: 2, backgroundColor: '#dbeafe' },
  itemCard: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', padding: 10, gap: 6 },
  itemCardPending: { borderColor: '#fde68a', backgroundColor: '#fffef7' },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemBody: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { fontFamily: APP_FONT_FAMILY, color: '#0f172a', fontSize: 13, fontWeight: '600' },
  time: { fontFamily: APP_FONT_FAMILY, color: '#64748b', fontSize: 11 },
  eventText: { fontFamily: APP_FONT_FAMILY, color: '#334155', fontSize: 12, fontWeight: '500', flexShrink: 1 },
  eventPending: { color: '#b45309' },
  performedBy: { fontFamily: APP_FONT_FAMILY, color: '#64748b', fontSize: 11, flexShrink: 1 },
  message: { fontFamily: APP_FONT_FAMILY, color: '#64748b', fontSize: 11 },
  link: { marginTop: 10, textAlign: 'center', fontFamily: APP_FONT_FAMILY, color: '#2563eb', fontSize: 12, fontWeight: '600' },
});
