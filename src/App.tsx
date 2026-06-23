import React, { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { trackPageview } from "@/lib/analytics";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AuthGateProvider } from "@/components/AuthGate";
import { isNative } from "@/lib/platform";
import AppLayout from "@/components/AppLayout";
import DiscoverPage from "@/pages/DiscoverPage";

// Retry a dynamic import once, then hard-reload if it still fails.
// Fixes "Failed to fetch dynamically imported module" after a redeploy,
// where the cached index.html points to chunk hashes that no longer exist.
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      const reloadedKey = "lovable:chunk-reloaded";
      if (typeof window !== "undefined" && !sessionStorage.getItem(reloadedKey)) {
        sessionStorage.setItem(reloadedKey, "1");
        window.location.reload();
        // Return a never-resolving promise while reload happens
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });

// Code-split non-initial routes for faster mobile TTI
const AuthPage = lazyWithRetry(() => import("@/pages/AuthPage"));
const OnboardingPage = lazyWithRetry(() => import("@/pages/OnboardingPage"));
const CreatePostPage = lazyWithRetry(() => import("@/pages/CreatePostPage"));
const EditPostPage = lazyWithRetry(() => import("@/pages/EditPostPage"));
const PostDetailPage = lazyWithRetry(() => import("@/pages/PostDetailPage"));
const UserProfilePage = lazyWithRetry(() => import("@/pages/UserProfilePage"));
const ProfilePage = lazyWithRetry(() => import("@/pages/ProfilePage"));
const NotificationsPage = lazyWithRetry(() => import("@/pages/NotificationsPage"));
const SavedPostsPage = lazyWithRetry(() => import("@/pages/SavedPostsPage"));
const CreateReelPage = lazyWithRetry(() => import("@/pages/CreateReelPage"));
const MyReelsPage = lazyWithRetry(() => import("@/pages/MyReelsPage"));
const AdminPanelPage = lazyWithRetry(() => import("@/pages/AdminPanelPage"));
const SettingsPage = lazyWithRetry(() => import("@/pages/SettingsPage"));
const BlockedAccountsPage = lazyWithRetry(() => import("@/pages/BlockedAccountsPage"));
const TermsPage = lazyWithRetry(() => import("@/pages/TermsPage"));
const PrivacyPage = lazyWithRetry(() => import("@/pages/PrivacyPage"));
const ContactPage = lazyWithRetry(() => import("@/pages/ContactPage"));
const AboutPage = lazyWithRetry(() => import("@/pages/AboutPage"));
const DeleteAccountPage = lazyWithRetry(() => import("@/pages/DeleteAccountPage"));
const SupportPage = lazyWithRetry(() => import("@/pages/SupportPage"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));


const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const publicLegalRoutes = (
  <>
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="/delete-account" element={<DeleteAccountPage />} />
    <Route path="/support" element={<SupportPage />} />
  </>
);

const RouteChangeTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageview(window.location.origin + location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
};

const AppRoutes = () => {

  const { isAuthenticated, isAdmin, loading, onboardingCompleted } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  // On native (iOS / Android) we keep the original gate: unauthenticated users
  // are routed to /auth. On the web we allow anonymous read-only browsing so
  // first-time visitors don't hit a sign-in wall.
  if (!isAuthenticated && isNative()) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          {publicLegalRoutes}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (isAuthenticated && !onboardingCompleted) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          {publicLegalRoutes}
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Routes that require a real account on web — anonymous visitors get bounced
  // to Discover (the BottomNav opens the sign-in modal instead).
  const RequireAuth = ({ children }: { children: JSX.Element }) =>
    isAuthenticated ? children : <Navigate to="/" replace />;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {publicLegalRoutes}
        <Route
          path="*"
          element={
            <AppLayout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<DiscoverPage />} />
                  <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />} />
                  <Route path="/onboarding" element={<Navigate to="/" replace />} />
                  <Route path="/post/new" element={<RequireAuth><CreatePostPage /></RequireAuth>} />
                  <Route path="/p/:id/edit" element={<RequireAuth><EditPostPage /></RequireAuth>} />
                  <Route path="/p/:id" element={<PostDetailPage />} />
                  <Route path="/u/:userId" element={<UserProfilePage />} />
                  <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                  <Route path="/saved" element={<RequireAuth><SavedPostsPage /></RequireAuth>} />
                  <Route path="/reel/new" element={<RequireAuth><CreateReelPage /></RequireAuth>} />
                  <Route path="/reels/mine" element={<RequireAuth><MyReelsPage /></RequireAuth>} />
                  <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                  <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                  <Route path="/settings/blocked" element={<RequireAuth><BlockedAccountsPage /></RequireAuth>} />
                  <Route path="/admin" element={isAdmin ? <AdminPanelPage /> : <Navigate to="/" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AppLayout>
          }
        />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <BrowserRouter>
          <AuthGateProvider>
            <RouteChangeTracker />
            <AppRoutes />
          </AuthGateProvider>

        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
