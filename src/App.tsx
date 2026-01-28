import "@/i18n/config";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import PhoneFrame from "@/components/phone/PhoneFrame";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load other pages for better initial load performance
const Trade = lazy(() => import("./pages/Trade"));
const Markets = lazy(() => import("./pages/Markets"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Earn = lazy(() => import("./pages/Earn"));
const Swap = lazy(() => import("./pages/Swap"));
const DepositWithdraw = lazy(() => import("./pages/DepositWithdraw"));
const OTC = lazy(() => import("./pages/OTC"));
const Mining = lazy(() => import("./pages/Mining"));
const News = lazy(() => import("./pages/News"));
const Quant = lazy(() => import("./pages/Quant"));
const Settings = lazy(() => import("./pages/Settings"));
const Assets = lazy(() => import("./pages/Assets"));
const Profile = lazy(() => import("./pages/Profile"));
const KYCVerification = lazy(() => import("./pages/KYCVerification"));
const KYC = lazy(() => import("./pages/KYC"));
const KYCAdvanced = lazy(() => import("./pages/KYCAdvanced"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const CustomerService = lazy(() => import("./pages/CustomerService"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ServiceLogin = lazy(() => import("./pages/ServiceLogin"));
const ServiceDashboard = lazy(() => import("./pages/ServiceDashboard"));
const AppDownload = lazy(() => import("./pages/AppDownload"));
const Messages = lazy(() => import("./pages/Messages"));

// Payment Platform Pages (SAXO UI)
const PaymentHome = lazy(() => import("./pages/payment-platform/PaymentHome"));
const PaymentTrade = lazy(() => import("./pages/payment-platform/PaymentTrade"));
const PaymentMarket = lazy(() => import("./pages/payment-platform/PaymentMarket"));
const PaymentWallet = lazy(() => import("./pages/payment-platform/PaymentWallet"));
const PaymentProfile = lazy(() => import("./pages/payment-platform/PaymentProfile"));
const PaymentLogin = lazy(() => import("./pages/payment-platform/PaymentLogin"));
const PaymentRegister = lazy(() => import("./pages/payment-platform/PaymentRegister"));
const PaymentDeposit = lazy(() => import("./pages/payment-platform/PaymentDeposit"));
const PaymentWithdraw = lazy(() => import("./pages/payment-platform/PaymentWithdraw"));
const PaymentTradeRecords = lazy(() => import("./pages/payment-platform/PaymentTradeRecords"));

// Optimized QueryClientwith better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <AdminAuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Main route - Phone Frame with SAXO UI */}
                  <Route path="/" element={
                    <PhoneFrame>
                      <PaymentHome />
                    </PhoneFrame>
                  } />
                  <Route path="/home" element={
                    <PhoneFrame>
                      <PaymentHome />
                    </PhoneFrame>
                  } />
                  <Route path="/trade" element={
                    <PhoneFrame>
                      <PaymentTrade />
                    </PhoneFrame>
                  } />
                  <Route path="/market" element={
                    <PhoneFrame>
                      <PaymentMarket />
                    </PhoneFrame>
                  } />
                  <Route path="/wallet" element={
                    <PhoneFrame>
                      <PaymentWallet />
                    </PhoneFrame>
                  } />
                  <Route path="/profile" element={
                    <PhoneFrame>
                      <PaymentProfile />
                    </PhoneFrame>
                  } />
                  <Route path="/login" element={
                    <PhoneFrame>
                      <PaymentLogin />
                    </PhoneFrame>
                  } />
                  <Route path="/register" element={
                    <PhoneFrame>
                      <PaymentRegister />
                    </PhoneFrame>
                  } />
                  <Route path="/deposit" element={
                    <PhoneFrame>
                      <PaymentDeposit />
                    </PhoneFrame>
                  } />
                  <Route path="/withdraw" element={
                    <PhoneFrame>
                      <PaymentWithdraw />
                    </PhoneFrame>
                  } />
                  <Route path="/trade-records" element={
                    <PhoneFrame>
                      <PaymentTradeRecords />
                    </PhoneFrame>
                  } />

                  {/* Legacy routes - redirect to new paths */}
                  <Route path="/payment-platform" element={<Navigate to="/" replace />} />
                  <Route path="/payment-platform/*" element={<Navigate to="/" replace />} />

                  {/* Admin routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<Admin />} />

                  {/* Catch all */}
                  <Route path="*" element={
                    <PhoneFrame>
                      <PaymentHome />
                    </PhoneFrame>
                  } />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AdminAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </I18nextProvider>
);

export default App;
