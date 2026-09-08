/**
 * FaceCamera — mobile (iOS / Android)
 *
 * Renders the blink-detection page inside a react-native-webview.
 * Camera permissions required:
 *   Android : android.permission.CAMERA in app.json → android.permissions
 *   iOS     : NSCameraUsageDescription in app.json → ios.infoPlist
 */
import React from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { FACE_CAMERA_HTML } from './faceCameraHtml';

type Props = {
  onMessage: (event: WebViewMessageEvent) => void;
};

export function FaceCamera({ onMessage }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ html: FACE_CAMERA_HTML }}
        style={{ flex: 1, backgroundColor: '#0f172a' }}
        originWhitelist={['*']}
        /* Camera / media flags */
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        /* JS */
        javaScriptEnabled
        domStorageEnabled
        /* Messages from the page */
        onMessage={onMessage}
        /* Suppress mixed-content warnings (CDN scripts are HTTPS) */
        mixedContentMode="always"
      />
    </View>
  );
}
