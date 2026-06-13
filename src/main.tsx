import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isNative } from "./lib/platform";
import { initAnalytics } from "./lib/analytics";

initAnalytics();


// Native-only bootstrap (no-op on web)
if (isNative()) {
  void (async () => {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
    } catch {}
    try {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide({ fadeOutDuration: 250 });
    } catch {}
    // Tell Capgo the new OTA bundle booted successfully — otherwise
    // the native shell rolls back to the previous bundle after ~10s.
    try {
      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
      await CapacitorUpdater.notifyAppReady();
    } catch {}
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
