import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for Ripple native iOS + Android.
 *
 * Bundle ID `in.myripple.app` is the production identifier registered against
 * the Apple App Store and Google Play Store listings. DO NOT change this
 * after the first store submission — bundle IDs are permanent.
 *
 * The `server.url` block (currently DISABLED) enables hot-reload from the
 * Lovable sandbox while developing on a real device. To dev against a phone:
 *   1. Uncomment the `server` block below
 *   2. Run `npx cap sync`
 *   3. Run `npx cap run ios` (or android)
 *
 * ⚠️ CRITICAL: The `server` block MUST stay commented out for any release
 * build (App Store / Play Store / TestFlight). Shipping a binary with the
 * sandbox URL = app loads Lovable preview instead of bundled assets =
 * automatic store rejection + broken app for users.
 */
const config: CapacitorConfig = {
  appId: 'in.myripple.app',
  appName: 'Ripple',
  webDir: 'dist',
  // 👇 DEV-ONLY hot reload — keep commented for release builds
  // server: {
  //   url: 'https://74c9b69b-cd6d-42fb-b279-125200f8f6c7.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#dc0000',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#dc0000',
    },
    Keyboard: {
      resize: 'native',
    },
    // Capgo Live Updates — ships new JS/CSS bundles to installed apps
    // without requiring an App Store / Play Store resubmission.
    // See docs/APP_STORE_SUBMISSION.md → "Shipping updates after launch".
    CapacitorUpdater: {
      autoUpdate: true,
      directUpdate: true,
      resetWhenUpdate: true,
      channel: 'production',
    },
  },
};

export default config;
