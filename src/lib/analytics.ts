// Thin wrapper around PostHog. Safe to call before init — every helper
// is a no-op until init() succeeds. We never throw from this module.
//
// Setup: drop your PostHog Project API key (starts with `phc_...`) and host
// into the constants below. Find them at posthog.com → Project Settings.
// The key is publishable (designed for client-side use) so it is safe in
// the source bundle.
import posthog from 'posthog-js';
import { isNative } from '@/lib/platform';

// Paste your PostHog Project API key here (publishable, safe in client).
// Leave empty to keep analytics disabled.
const POSTHOG_KEY = '';
// 'https://us.i.posthog.com' (US cloud) or 'https://eu.i.posthog.com' (EU cloud).
const POSTHOG_HOST = 'https://us.i.posthog.com';

let ready = false;

export const initAnalytics = () => {
  if (ready || !POSTHOG_KEY) return;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      // No cookies — uses localStorage. Avoids needing a GDPR banner.
      persistence: 'localStorage',
      capture_pageview: false, // we capture manually on route change
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      loaded: (ph) => {
        ph.register({
          platform: isNative() ? 'native' : 'web',
          app: 'ripple',
        });
      },
    });
    ready = true;
  } catch {
    // analytics must never break the app
  }
};

export const trackPageview = (path?: string) => {
  if (!ready) return;
  try {
    posthog.capture('$pageview', { $current_url: path ?? window.location.href });
  } catch {}
};

export const track = (event: string, props?: Record<string, unknown>) => {
  if (!ready) return;
  try {
    posthog.capture(event, props);
  } catch {}
};

export const identifyUser = (
  userId: string,
  props?: Record<string, unknown>,
) => {
  if (!ready) return;
  try {
    posthog.identify(userId, props);
  } catch {}
};

export const resetUser = () => {
  if (!ready) return;
  try {
    posthog.reset();
  } catch {}
};
