/**
 * FaceCamera — mobile (iOS / Android)
 *
 * Renders the blink-detection page inside a react-native-webview.
 * Camera permissions required:
 *   Android : android.permission.CAMERA in app.json → android.permissions
 *             + onPermissionRequest to grant camera access to WebView web content
 *   iOS     : NSCameraUsageDescription in app.json → ios.infoPlist
 *             + mediaCapturePermissionGrantType="grant" to skip the second system prompt
 *
 * Why both props?
 *   Even when the HOST app holds the CAMERA permission, Android WebView raises
 *   a separate PermissionRequest for the web content (getUserMedia).  Without
 *   onPermissionRequest the browser dialog never resolves and the camera stays
 *   black.  On iOS, mediaCapturePermissionGrantType="grant" tells WKWebView to
 *   auto-approve media-capture requests so the app-level permission is enough.
 */
import React from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

/** Minimal shape of the Android WebView PermissionRequest object. */
type WebViewPermissionRequest = {
  resources: string[];
  grant(resources: string[]): void;
  deny(): void;
};

import { FACE_CAMERA_HTML } from './faceCameraHtml';

type Props = {
  onMessage: (event: WebViewMessageEvent) => void;
};

export function FaceCamera({ onMessage }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ html: FACE_CAMERA_HTML, baseUrl: 'https://localhost' }}
        style={{ flex: 1, backgroundColor: '#0f172a' }}
        originWhitelist={['*']}

        /* ── Camera / media flags ── */
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}

        /*
         * iOS — auto-approve camera (and mic) capture requests made by the
         * page via getUserMedia, so the app-level NSCameraUsageDescription
         * is the only prompt the user ever sees.
         */
        mediaCapturePermissionGrantType="grant"

        /*
         * Android — the WebView raises a PermissionRequest when the page calls
         * getUserMedia.  Without this handler the request silently times out
         * and the camera never starts, even if the app already holds CAMERA.
         * request.grant(request.resources) approves every resource the page asks
         * for (typically ["android.webkit.resource.VIDEO_CAPTURE"]).
         */
        onPermissionRequest={(request: WebViewPermissionRequest) => request.grant(request.resources)}

        /* ── JS ── */
        javaScriptEnabled
        domStorageEnabled

        /* ── Messages from the page ── */
        onMessage={onMessage}

        /* Suppress mixed-content warnings (CDN scripts are HTTPS) */
        mixedContentMode="always"
      />
    </View>
  );
}
