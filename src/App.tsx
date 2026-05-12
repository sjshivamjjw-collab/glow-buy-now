import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
import HomeFeed from "@/pages/HomeFeed";
import CategoriesPage from "@/pages/CategoriesPage";
import CategoryDetailPage from "@/pages/CategoryDetailPage";
import LivestreamRoom from "@/pages/LivestreamRoom";
import CheckoutPage from "@/pages/CheckoutPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import SellerDashboard from "@/pages/SellerDashboard";
import SellerApplicationPage from "@/pages/SellerApplicationPage";
import AdminApplicationsPage from "@/pages/AdminApplicationsPage";
import AdminPanelPage from "@/pages/AdminPanelPage";
import ProductsPage from "@/pages/ProductsPage";
import CreateProductPage from "@/pages/CreateProductPage";
import GoLivePage from "@/pages/GoLivePage";
import SellerProfilePage from "@/pages/SellerProfilePage";
import NotificationsPage from "@/pages/NotificationsPage";
import AddressesPage from "@/pages/AddressesPage";
import ShopPage from "@/pages/ShopPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import RefundsPage from "@/pages/RefundsPage";
import ShippingPage from "@/pages/ShippingPage";
import ContactPage from "@/pages/ContactPage";
import AboutPage from "@/pages/AboutPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Routes that are accessible without login (needed for payment-processor KYC reviewers)
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
  const { isAuthenticated, role, isAdmin, loading, onboardingCompleted } = useAuth();

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
      <Route path="/stream/:id" element={<LivestreamRoom />} />
      <Route path="/checkout/:productId" element={<CheckoutPage />} />
      {publicLegalRoutes}
      <Route
        path="*"
        element={
          <AppLayout>
            <Routes>
              <Route path="/" element={role === 'admin' ? <AdminPanelPage /> : role === 'seller' ? <SellerDashboard /> : <HomeFeed />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/category/:name" element={<CategoryDetailPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/order/:id" element={<OrderDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/new" element={<CreateProductPage />} />
              <Route path="/go-live" element={<GoLivePage />} />
              <Route path="/seller/:id" element={<SellerProfilePage />} />
              <Route path="/become-seller" element={<SellerApplicationPage />} />
              <Route path="/admin" element={isAdmin ? <AdminPanelPage /> : <Navigate to="/" replace />} />
              <Route path="/admin/applications" element={isAdmin ? <AdminApplicationsPage /> : <Navigate to="/" replace />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/addresses" element={<AddressesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
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
