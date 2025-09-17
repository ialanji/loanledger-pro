import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Credits from "./pages/Credits";
import CreateCredit from "./pages/CreateCredit";
import Payments from "./pages/Payments";
import Banks from "./pages/Banks";
import Sales from "./pages/Sales";
import CashDesk from "./pages/CashDesk";
import Expenses from "./pages/Expenses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/sales" replace />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/credits/new" element={<CreateCredit />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/banks" element={<Banks />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/cash-desk" element={<CashDesk />} />
            <Route path="/expenses" element={<Expenses />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
