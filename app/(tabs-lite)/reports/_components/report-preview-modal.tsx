import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useByteToBase64 } from '@/hooks/api/file-handle/useByteToBase64';

const F = 'Inter';

const MIME: Record<string, string> = {
  pdf:   'application/pdf',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsx:  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:   'application/vnd.ms-excel',
  csv:   'text/csv',
  doc:   'application/msword',
  docx:  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function getMime(ext: string) {
  return MIME[(ext ?? '').toLowerCase()] ?? 'application/octet-stream';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportName?: string;
  extension?: string;
  rawReport?: string;
  onDownload: () => void;
}

// Builds an HTML page that uses SheetJS (CDN) to parse and render the base64 spreadsheet
function buildSpreadsheetHtml(base64: string): string {
  const safe = base64.replace(/`/g, '');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; font-size: 12px; background: #f8fafc; }
    #loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: #64748b; font-size: 14px; }
    #error { padding: 24px; color: #dc2626; text-align: center; font-size: 13px; }
    .sheet-label { font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.6px; padding: 8px 14px; background: #eff6ff; border-bottom: 1px solid #dbeafe; }
    #table-wrap { overflow: auto; }
    table { border-collapse: collapse; width: 100%; }
    thead tr { background: #1e40af; }
    th { color: #fff; padding: 7px 14px; text-align: left; font-size: 11px; font-weight: 700; white-space: nowrap; border: 1px solid #1e3a8a; }
    td { padding: 6px 14px; border: 1px solid #e2e8f0; white-space: nowrap; color: #0f172a; font-size: 12px; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:nth-child(odd)  td { background: #ffffff; }
  </style>
</head>
<body>
  <div id="loading">Loading spreadsheet…</div>
  <div id="out" style="display:none"></div>
  <script>
    window.onload = function () {
      try {
        var b64 = \`${safe}\`;
        var wb = XLSX.read(b64, { type: 'base64' });
        var name = wb.SheetNames[0];
        var ws   = wb.Sheets[name];
        var html = XLSX.utils.sheet_to_html(ws);
        document.getElementById('out').innerHTML = '<div class="sheet-label">' + name + '</div><div id="table-wrap">' + html + '</div>';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('out').style.display    = 'block';
      } catch (e) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('out').innerHTML = '<div id="error">Could not parse spreadsheet.<br>' + e.message + '</div>';
        document.getElementById('out').style.display = 'block';
      }
    };
  </script>
</body>
</html>`;
}

// WebView is native-only; on web we use a plain <iframe>
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

// Renders an in-app viewer — WebView on native, <iframe> on web
function InAppViewer({ html, uri }: { html?: string; uri?: string }) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        {React.createElement('iframe', {
          src: uri,
          srcdoc: html,
          style: { flex: 1, border: 'none', width: '100%', height: '100%' },
          title: 'File Preview',
          allow: 'fullscreen',
        })}
      </View>
    );
  }
  const source = html ? { html } : { uri: uri! };
  return (
    <WebView
      source={source}
      style={{ flex: 1 }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      renderLoading={() => (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={s.stateTxt}>Loading…</Text>
        </View>
      )}
    />
  );
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  reportName,
  extension,
  rawReport,
  onDownload,
}: Props) {
  const insets = useSafeAreaInsets();
  const ext      = (extension ?? '').toLowerCase();
  const isPdf    = ext === 'pdf';
  const isSpread = ['excel', 'xlsx', 'xls', 'csv'].includes(ext);

  const [dataUri,    setDataUri]    = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { fetchByteArray, loading } = useByteToBase64();

  useEffect(() => {
    if (!isOpen || !rawReport) return;
    setDataUri(null);
    setFetchError(null);

    const isPath = rawReport.startsWith('/') || rawReport.startsWith('app/');
    if (!isPath) {
      setDataUri(`data:${getMime(ext)};base64,${rawReport}`);
      return;
    }

    fetchByteArray(rawReport, getMime(ext)).then((result) => {
      if (result.success && result.objectUrl) {
        setDataUri(result.objectUrl);
      } else {
        setFetchError(result.error ?? 'Failed to load file.');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, rawReport]);

  const base64Only = dataUri?.split(',')[1] ?? '';

  const renderContent = () => {
    if (loading) {
      return (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={s.stateTxt}>Preparing file…</Text>
        </View>
      );
    }

    if (fetchError) {
      return (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={36} color="#dc2626" />
          <Text style={[s.stateTxt, { color: '#dc2626', marginTop: 4 }]}>{fetchError}</Text>
          <Pressable style={s.actionBtn} onPress={onClose}>
            <Text style={s.actionBtnTxt}>Close</Text>
          </Pressable>
        </View>
      );
    }

    if (!dataUri) return null;

    if (isSpread) {
      return <InAppViewer html={buildSpreadsheetHtml(base64Only)} />;
    } else if (isPdf) {
      if (Platform.OS === 'android') {
        return (
          <View style={s.center}>
            <View style={s.fallbackIcon}>
              <Ionicons name="document-outline" size={40} color="#dc2626" />
            </View>
            <Text style={s.fallbackTitle}>PDF Preview</Text>
            <Text style={s.fallbackSub}>
              In-app PDF preview is not supported on Android.{'\n'}Use Download to view the file.
            </Text>
          </View>
        );
      }
      return <InAppViewer uri={dataUri} />;
    } else {
      return (
        <View style={s.center}>
          <View style={s.fallbackIcon}>
            <Ionicons name="document-text-outline" size={40} color="#2563eb" />
          </View>
          <Text style={s.fallbackTitle}>Preview Unavailable</Text>
          <Text style={s.fallbackSub}>
            In-app preview for {ext.toUpperCase()} files is not supported yet.
          </Text>
        </View>
      );
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}>

      {/* Dim backdrop — tap to close */}
      <Pressable style={s.backdrop} onPress={onClose} />

      {/* Bottom sheet */}
      <View style={[s.sheet, { paddingBottom: insets.bottom || 16 }]}>

        {/* Drag handle */}
        <View style={s.handle} />

        {/* Title row */}
        <View style={s.titleRow}>
          <Text style={s.titleTxt} numberOfLines={1}>
            {reportName ?? 'File Preview'}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} style={s.closeBtn}>
            <Ionicons name="close" size={18} color="#64748b" />
          </Pressable>
        </View>

        {/* Preview area */}
        <View style={s.preview}>
          {renderContent()}
        </View>

        {/* Download button */}
        <View style={s.footer}>
          <Pressable
            style={s.downloadBtn}
            onPress={() => { onClose(); onDownload(); }}>
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={s.downloadTxt}>Download</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
  },

  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },

  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  titleTxt: {
    flex: 1,
    fontFamily: F, fontSize: 15, fontWeight: '800', color: '#0f172a',
  },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },

  preview: { flex: 1 },

  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#0a1c63',
    borderRadius: 12, height: 46,
  },
  downloadTxt: {
    fontFamily: F, fontSize: 14, fontWeight: '700', color: '#ffffff',
  },

  // States
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 10,
  },
  stateTxt: {
    fontFamily: F, fontSize: 14, color: '#64748b', textAlign: 'center',
  },
  actionBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#f1f5f9', borderRadius: 10, marginTop: 4,
  },
  actionBtnTxt: {
    fontFamily: F, fontSize: 13, fontWeight: '700', color: '#64748b',
  },
  fallbackIcon: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9', marginBottom: 4,
  },
  fallbackTitle: {
    fontFamily: F, fontSize: 17, fontWeight: '800', color: '#0f172a',
  },
  fallbackSub: {
    fontFamily: F, fontSize: 13, color: '#64748b',
    textAlign: 'center', lineHeight: 20,
  },
});
