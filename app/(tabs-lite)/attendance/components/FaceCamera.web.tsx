/**
 * FaceCamera — web / laptop (Expo Web / react-native-web)
 *
 * react-native-webview does not work on the web platform.
 * This file is automatically resolved instead of FaceCamera.tsx
 * when Expo builds for web (Metro's platform-specific extension rules).
 *
 * It uses an <iframe srcDoc=...> so the same HTML runs natively in
 * the browser.  The iframe communicates via window.postMessage.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { FACE_CAMERA_HTML } from './faceCameraHtml';

type Props = {
  /** Mirror of react-native-webview's onMessage signature for the parent */
  onMessage: (event: { nativeEvent: { data: string } }) => void;
};

export function FaceCamera({ onMessage }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const handleWindowMessage = useCallback(
    (e: MessageEvent) => {
      if (typeof e.data !== 'string') return;
      // Only accept messages from our own iframe origin
      onMessage({ nativeEvent: { data: e.data } });
    },
    [onMessage]
  );

  useEffect(() => {
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [handleWindowMessage]);

  return (
    <View style={{ flex: 1 }}>
      {/* @ts-ignore — <iframe> is valid in react-native-web (renders native DOM) */}
      <iframe
        ref={iframeRef}
        srcDoc={FACE_CAMERA_HTML}
        allow="camera; microphone"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 16,
          background: '#0f172a',
        }}
        title="Face Attendance Camera"
      />
    </View>
  );
}
