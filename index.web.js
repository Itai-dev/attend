// Web preview entry: CanvasKit (Skia for web) must be loaded before any module
// that captures it is evaluated, so the router is started only once it is ready.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  const { App } = require('expo-router/build/qualified-entry');
  const { renderRootComponent } = require('expo-router/build/renderRootComponent');
  renderRootComponent(App);
});
