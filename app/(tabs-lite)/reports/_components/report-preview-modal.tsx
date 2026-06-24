import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useByteToBase64 } from '@/hooks/api/file-handle/useByteToBase64';

const F = 'Inter';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function getMime(ext: string) {
  return MIME[(ext ?? '').toLowerCase()] ?? 'application/octet-stream';
}

function getLabel(ext: string) {
  const e = (ext ?? '').toLowerCase();
  if (e === 'pdf') return 'PDF Document';
  if (e === 'excel' || e === 'xlsx' || e === 'xls') return 'Excel Spreadsheet';
  if (e === 'csv') return 'CSV File';
  if (e === 'doc' || e === 'docx') return 'Word Document';
  return 'File';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportName?: string;
  extension?: string;
  /** Raw value from report.report: server path or base64 string */
  rawReport?: string;
  onDownload: () => void;
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  reportName,
  extension,
  rawReport,
  onDownload,
}: Props) {
  const isPdf = (extension ?? '').toLowerCase() === 'pdf';
  const isExcel = ['excel', 'xlsx', 'xls'].includes((extension ?? '').toLowerCase());
  const displayExt = extension === 'excel' ? 'XLSX' : (extension ?? '').toUpperCase();

  const [dataUri, setDataUri] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { fetchByteArray, loading } = useByteToBase64();

  // Resolve the data URI whenever the modal opens
  useEffect(() => {
    if (!isOpen || !rawReport) return;
    setDataUri(null);
    setFetchError(null);

    const isPath = rawReport.startsWith('/') || rawReport.startsWith('app/');
    if (!isPath) {
      // Already base64 — build data URI immediately, no network call
      setDataUri(`data:${getMime(extension ?? 'pdf')};base64,${rawReport}`);
      return;
    }

    // Server path — fetch and convert
    fetchByteArray(rawReport, getMime(extension ?? 'pdf')).then((result) => {
      if (result.success && result.objectUrl) {
        setDataUri(result.objectUrl);
      } else {
        setFetchError(result.error ?? 'Failed to load file.');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, rawReport]);

  const openFile = async () => {
    if (!dataUri) return;
    try {
      // Linking.openURL hands the URI to the OS.
      // On iOS:  Safari / Files app opens PDFs inline.
      // On Android: the system opens the registered app (PDF viewer, Sheets, etc.)
      const canOpen = await Linking.canOpenURL(dataUri);
      if (canOpen) {
        await Linking.openURL(dataUri);
      } else {
        // Fallback: try opening via web browser (may download on Android for data: URIs)
        const { openBrowserAsync } = await import('expo-web-browser');
        await openBrowserAsync(dataUri);
      }
    } catch (e: any) {
      Alert.alert('Cannot Open File', e?.message ?? 'No app available to open this file type.');
    }
  };

  const ready = !loading && !!dataUri;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={s.screen}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.blob1} />
          <View style={s.blob2} />
          <View style={s.headerRow}>
            <Pressable onPress={onClose} hitSlop={8} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
            <Text style={s.headerTitle}>File Preview</Text>
            {/* spacer so title is centred */}
            <View style={s.closeBtn} />
          </View>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* ── File icon ──────────────────────────────────────────────── */}
          <View style={s.iconBlock}>
            <View style={[s.iconCircle, { backgroundColor: isPdf ? '#fef2f2' : isExcel ? '#f0fdf4' : '#f0f9ff' }]}>
              <Ionicons
                name={isPdf ? 'document-outline' : isExcel ? 'grid-outline' : 'document-text-outline'}
                size={56}
                color={isPdf ? '#dc2626' : isExcel ? '#16a34a' : '#2563eb'}
              />
            </View>
            <View style={[s.extBadge, { backgroundColor: isPdf ? '#fee2e2' : isExcel ? '#dcfce7' : '#dbeafe' }]}>
              <Text style={[s.extBadgeTxt, { color: isPdf ? '#dc2626' : isExcel ? '#16a34a' : '#2563eb' }]}>
                {displayExt}
              </Text>
            </View>
          </View>

          {/* ── File info ──────────────────────────────────────────────── */}
          <View style={s.infoCard}>
            <Text style={s.fileName} numberOfLines={3}>{reportName ?? 'Report'}</Text>
            <Text style={s.fileType}>{getLabel(extension ?? '')}</Text>
          </View>

          {/* ── State: loading / error / ready ─────────────────────────── */}
          {loading && (
            <View style={s.stateCard}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={s.stateTxt}>Preparing file…</Text>
            </View>
          )}

          {fetchError && (
            <View style={[s.stateCard, s.stateError]}>
              <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
              <Text style={[s.stateTxt, { color: '#dc2626' }]}>{fetchError}</Text>
              <Pressable style={s.retryBtn} onPress={onClose}>
                <Text style={s.retryTxt}>Close</Text>
              </Pressable>
            </View>
          )}

          {/* ── Actions (only show when file is ready) ──────────────────── */}
          {!loading && !fetchError && (
            <>
              <View style={s.noteCard}>
                <Ionicons name="information-circle-outline" size={18} color="#7c3aed" />
                <Text style={s.noteText}>
                  {Platform.OS === 'ios'
                    ? 'Opens in the Files / Safari app so you can view, share, or save the file.'
                    : 'Opens in the app registered on your device for this file type (PDF viewer, Sheets, etc.).'}
                </Text>
              </View>

              <View style={s.actions}>
                <Pressable
                  style={({ pressed }) => [s.btn, s.btnPrimary, !ready && s.btnDisabled, pressed && { opacity: 0.88 }]}
                  onPress={openFile}
                  disabled={!ready}>
                  <Ionicons name="eye-outline" size={18} color="#fff" />
                  <Text style={s.btnTxt}>Open File</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [s.btn, s.btnOutline, pressed && { opacity: 0.88 }]}
                  onPress={() => { onClose(); onDownload(); }}>
                  <Ionicons name="download-outline" size={18} color="#7c3aed" />
                  <Text style={[s.btnTxt, { color: '#7c3aed' }]}>Download</Text>
                </Pressable>
              </View>

              <View style={s.tipsCard}>
                <Text style={s.tipsTitle}>What happens</Text>
                {(Platform.OS === 'ios'
                  ? [
                      { icon: 'phone-portrait-outline', text: 'iOS opens PDFs in Safari or Files directly' },
                      { icon: 'share-outline', text: 'You can share or save from the viewer' },
                      { icon: 'arrow-back-outline', text: 'Tap Done or the back gesture to return' },
                    ]
                  : [
                      { icon: 'apps-outline', text: 'Android opens in your default PDF / Office app' },
                      { icon: 'share-outline', text: 'You can share or save from that app' },
                      { icon: 'arrow-back-outline', text: 'Use the back button to return here' },
                    ]
                ).map((tip) => (
                  <View key={tip.text} style={s.tipRow}>
                    <View style={s.tipIcon}>
                      <Ionicons name={tip.icon as any} size={14} color="#7c3aed" />
                    </View>
                    <Text style={s.tipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f3ff' },

  header: {
    backgroundColor: '#4c1d95',
    paddingTop: 14, paddingBottom: 18, paddingHorizontal: 16, overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    right: -30, top: -50, backgroundColor: '#6d28d9', opacity: 0.5,
  },
  blob2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    right: 60, top: 5, backgroundColor: '#7c3aed', opacity: 0.25,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: { fontFamily: F, fontSize: 17, fontWeight: '700', color: '#fff' },

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 16 },

  iconBlock: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  extBadge: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5 },
  extBadgeTxt: { fontFamily: F, fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  fileName: { fontFamily: F, fontSize: 17, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  fileType: { fontFamily: F, fontSize: 13, color: '#64748b' },

  stateCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#f1f5f9',
  },
  stateError: { borderColor: '#fee2e2', backgroundColor: '#fff5f5' },
  stateTxt: { fontFamily: F, fontSize: 14, color: '#64748b', textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: '#fee2e2', borderRadius: 10,
  },
  retryTxt: { fontFamily: F, fontSize: 13, fontWeight: '700', color: '#dc2626' },

  noteCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#ede9fe', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#ddd6fe',
  },
  noteText: { fontFamily: F, fontSize: 13, color: '#4c1d95', flex: 1, lineHeight: 19 },

  actions: { gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, height: 50,
  },
  btnPrimary: { backgroundColor: '#7c3aed' },
  btnDisabled: { backgroundColor: '#c4b5fd' },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#7c3aed' },
  btnTxt: { fontFamily: F, fontSize: 15, fontWeight: '700', color: '#fff' },

  tipsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  tipsTitle: {
    fontFamily: F, fontSize: 12, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipIcon: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: '#ede9fe',
    alignItems: 'center', justifyContent: 'center',
  },
  tipText: { fontFamily: F, fontSize: 13, color: '#475569', flex: 1 },
});
