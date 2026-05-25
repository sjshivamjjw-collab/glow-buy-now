import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import DiscoverPage from "@/pages/DiscoverPage";

// Code-split non-initial routes for faster mobile TTI
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const CreatePostPage = lazy(() => import("@/pages/CreatePostPage"));
const EditPostPage = lazy(() => import("@/pages/EditPostPage"));
const PostDetailPage = lazy(() => import("@/pages/PostDetailPage"));
const UserProfilePage = lazy(() => import("@/pages/UserProfilePage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SavedPostsPage = lazy(() => import("@/pages/SavedPostsPage"));
const AdminPanelPage = lazy(() => import("@/pages/AdminPanelPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const RefundsPage = lazy(() => import("@/pages/RefundsPage"));
const ShippingPage = lazy(() => import("@/pages/ShippingPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

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
    <Route path="/refunds" element={<RefundsPage />} />
    <Route path="/shipping" element={<ShippingPage />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/about" element={<AboutPage />} />
  </>
);

const AppRoutes = () => {
  const { isAuthenticated, isAdmin, loading, onboardingCompleted } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
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

  if (!onboardingCompleted) {
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
                  <Route path="/onboarding" element={<Navigate to="/" replace />} />
                  <Route path="/post/new" element={<CreatePostPage />} />
                  <Route path="/p/:id" element={<PostDetailPage />} />
                  <Route path="/u/:userId" element={<UserProfilePage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/saved" element={<SavedPostsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
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
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
