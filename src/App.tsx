import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/hooks/useAuth";
import { PermissionsRealtimeSync } from "@/hooks/usePermissions";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Settings = lazy(() => import("./pages/Settings"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const VehiclesList = lazy(() => import("./pages/VehiclesList"));
const VehicleForm = lazy(() => import("./pages/VehicleForm"));
const VehicleDetail = lazy(() => import("./pages/VehicleDetail"));
const Customers = lazy(() => import("./pages/Customers"));
const Sales = lazy(() => import("./pages/Sales"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Inquiries = lazy(() => import("./pages/Inquiries"));
const AuthorityToSell = lazy(() => import("./pages/AuthorityToSell"));
const PerformanceQuotes = lazy(() => import("./pages/PerformanceQuotes"));
const SignCustomer = lazy(() => import("./pages/SignCustomer"));
const SignSale = lazy(() => import("./pages/SignSale"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const SourceCompanyDetails = lazy(() => import("./pages/SourceCompanyDetails"));
const Profile = lazy(() => import("./pages/Profile"));

const PageLoader = () => (
  <div className="h-[60vh] w-full flex items-center justify-center">
    <Loader2 className="h-10 w-10 animate-spin text-emerald-500 opacity-20" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Blocks protected routes — shows spinner then redirects to /auth if no session. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/** Shows a spinner / Auth page while session resolves; redirects to dashboard if already signed in. */
function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <>{children}</>;          // Show auth page instantly
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root → always land on sign-in */}
      <Route path="/" element={<Navigate to="/auth" replace />} />

      {/* Public pages */}
      <Route path="/auth"                element={<GuestGuard><Auth /></GuestGuard>} />
      <Route path="/portal"              element={<CustomerPortal />} />
      <Route path="/sign/customer/:id"   element={<SignCustomer />} />
      <Route path="/sign/sale/:id"       element={<SignSale />} />

      {/* Protected pages — inside AuthGuard + AppLayout */}
      <Route path="/*" element={
        <AuthGuard>
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/dashboard"         element={<Index />} />
                <Route path="/profile"           element={<Profile />} />
                <Route path="/vehicles"          element={<RoleGuard page="vehicles"><VehiclesList /></RoleGuard>} />
                <Route path="/vehicles/new"      element={<RoleGuard page="vehicles"><VehicleForm /></RoleGuard>} />
                <Route path="/vehicles/:id"      element={<RoleGuard page="vehicles"><VehicleDetail /></RoleGuard>} />
                <Route path="/vehicles/:id/edit" element={<RoleGuard page="vehicles"><VehicleForm /></RoleGuard>} />
                <Route path="/source-company/:name" element={<RoleGuard page="vehicles"><SourceCompanyDetails /></RoleGuard>} />
                <Route path="/customers"         element={<RoleGuard page="customers"><Customers /></RoleGuard>} />
                <Route path="/sales"             element={<RoleGuard page="sales"><Sales /></RoleGuard>} />
                <Route path="/invoices"          element={<RoleGuard page="invoices"><Invoices /></RoleGuard>} />
                <Route path="/inquiries"         element={<RoleGuard page="inquiries"><Inquiries /></RoleGuard>} />
                <Route path="/authority-to-sell" element={<RoleGuard page="authority-to-sell"><AuthorityToSell /></RoleGuard>} />
                <Route path="/performance-quotes" element={<RoleGuard page="performance-quotes"><PerformanceQuotes /></RoleGuard>} />
                {/* Settings — only super_admin can see; RoleGuard handled internally */}
                <Route path="/settings"          element={<Settings />} />
                <Route path="/unauthorized"      element={<Unauthorized />} />
                <Route path="*"                  element={<NotFound />} />
              </Routes>
            </Suspense>
          </AppLayout>
        </AuthGuard>
      } />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Single global Realtime listener — must be inside QueryClientProvider */}
        <PermissionsRealtimeSync />
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
