import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Credits from "./pages/Credits";
import CreateCredit from "./pages/CreateCredit";
import EditCredit from "./pages/EditCredit";
import PaymentSchedule from "./pages/PaymentSchedule";
import Payments from "./pages/Payments";
import Banks from "./pages/Banks";
import Sales from "./pages/Sales";
import CashDesk from "./pages/CashDesk";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import Aliases from './pages/Aliases'
import { AliasManagement } from '@/components/AliasManagement'
import ManualPaymentCalculation from "./pages/ManualPaymentCalculation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/credits/new" element={<CreateCredit />} />
            <Route path="/credits/:id/edit" element={<EditCredit />} />
            <Route path="/credits/:id/schedule" element={<PaymentSchedule />} />
            <Route path="/credits/:id/manual-calculation" element={<ManualPaymentCalculation />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/banks" element={<Banks />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/cash-desk" element={<CashDesk />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/aliases" element={<Aliases />} />
            <Route path="/aliases-management" element={<AliasManagement />} />
            {/* Catch-all route for unknown paths */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
