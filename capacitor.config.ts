import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for Ripple native iOS + Android.
 *
 * The `server.url` block enables hot-reload from the Lovable sandbox while
 * developing on a real device. IMPORTANT: comment this block out (or run with
 * a different config) before producing a release build for the App Store /
 * Play Store — otherwise the store binary will load the sandbox URL instead
 * of the bundled web assets.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.74c9b69bcd6d42fbb279125200f8f6c7',
  appName: 'Ripple',
  webDir: 'dist',
  // 👇 DEV ONLY — remove for release builds
  server: {
    url: 'https://74c9b69b-cd6d-42fb-b279-125200f8f6c7.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
