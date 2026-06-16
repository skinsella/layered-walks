import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Web-only HTML shell for the static export. Adds the "installable web app" tags so that
 * Add to Home Screen on iOS/Android launches Layered Walks fullscreen, like a native app.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        {/* iOS: launch fullscreen from the home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Layered Walks" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#FAF7F1" />
        <link rel="manifest" href="/layered-walks/manifest.json" />
        <ScrollViewStyleReset />
        <style>{`html, body { background-color: #FAF7F1; }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
