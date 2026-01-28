import "@/i18n/config";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

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
                  <Route path="/" element={<Index />} />
                  <Route path="/trade" element={<Trade />} />
                  <Route path="/markets" element={<Markets />} />
                  <Route path="/contracts" element={<Contracts />} />
                  <Route path="/earn" element={<Earn />} />
                  <Route path="/swap" element={<Swap />} />
                  <Route path="/deposit-withdraw" element={<DepositWithdraw />} />
                  <Route path="/deposit" element={<DepositWithdraw />} />
                  <Route path="/withdraw" element={<DepositWithdraw />} />
                  <Route path="/otc" element={<OTC />} />
                  <Route path="/mining" element={<Mining />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/quant" element={<Quant />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/assets" element={<Assets />} />
                  <Route path="/profile" element={<Profile />} />
                                    <Route path="/kyc" element={<KYC />} />
                                    <Route path="/kyc/advanced" element={<KYCAdvanced />} />
                                    <Route path="/kyc-verification" element={<KYCVerification />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/customer-service" element={<CustomerService />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/service" element={<ServiceLogin />} />
                  <Route path="/service/dashboard" element={<ServiceDashboard />} />
                                    <Route path="/download" element={<AppDownload />} />
                                                                        <Route path="/messages" element={<Messages />} />
                  
                                                      {/* Payment Platform Routes (SAXO UI) */}
                                                      <Route path="/payment-platform" element={<PaymentHome />} />
                                                      <Route path="/payment-platform/trade" element={<PaymentTrade />} />
                                                      <Route path="/payment-platform/market" element={<PaymentMarket />} />
                                                      <Route path="/payment-platform/wallet" element={<PaymentWallet />} />
                                                      <Route path="/payment-platform/profile" element={<PaymentProfile />} />
                                                      <Route path="/payment-platform/login" element={<PaymentLogin />} />
                                                      <Route path="/payment-platform/register" element={<PaymentRegister />} />
                                                      <Route path="/payment-platform/deposit" element={<PaymentDeposit />} />
                                                      <Route path="/payment-platform/withdraw" element={<PaymentWithdraw />} />
                                                      <Route path="/payment-platform/trade-records" element={<PaymentTradeRecords />} />
                  
                                                      <Route path="*" element={<NotFound />} />
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
