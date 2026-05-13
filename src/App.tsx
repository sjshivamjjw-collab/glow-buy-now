import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
import DiscoverPage from "@/pages/DiscoverPage";
import CommunityDetailPage from "@/pages/CommunityDetailPage";
import CreateCommunityPage from "@/pages/CreateCommunityPage";
import EditCommunityPage from "@/pages/EditCommunityPage";
import CreatorDashboard from "@/pages/CreatorDashboard";
import CreatorInsightsPage from "@/pages/CreatorInsightsPage";
import MyCommunitiesPage from "@/pages/MyCommunitiesPage";
import CommunityRoomPage from "@/pages/CommunityRoomPage";
import ProfilePage from "@/pages/ProfilePage";
import SubscriptionsPage from "@/pages/SubscriptionsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import AdminPanelPage from "@/pages/AdminPanelPage";
import SettingsPage from "@/pages/SettingsPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import RefundsPage from "@/pages/RefundsPage";
import ShippingPage from "@/pages/ShippingPage";
import ContactPage from "@/pages/ContactPage";
import AboutPage from "@/pages/AboutPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        {publicLegalRoutes}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  if (!onboardingCompleted) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        {publicLegalRoutes}
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {publicLegalRoutes}
      <Route
        path="*"
        element={
          <AppLayout>
            <Routes>
              <Route path="/" element={<DiscoverPage />} />
              <Route path="/c/:slug" element={<CommunityDetailPage />} />
              <Route path="/c/:slug/room" element={<CommunityRoomPage />} />
              <Route path="/communities/new" element={<CreateCommunityPage />} />
              <Route path="/communities/:id/edit" element={<EditCommunityPage />} />
              <Route path="/creator" element={<CreatorDashboard />} />
              <Route path="/creator/insights" element={<CreatorInsightsPage />} />
              <Route path="/mine" element={<MyCommunitiesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/admin" element={isAdmin ? <AdminPanelPage /> : <Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        }
      />
    </Routes>
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
