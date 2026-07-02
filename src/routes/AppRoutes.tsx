import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import Layout from "../components/Layout";
import Onboarding from "../components/onboarding/Onboarding";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Customers from "../pages/Customers";
import CustomerDetail from "../pages/CustomerDetail";
import Invoices from "../pages/Invoices";
import Payments from "../pages/Payments";
import Receipts from "../pages/Receipts";
import Transfers from "../pages/Transfers";
import TransactionsPage from "../pages/TransactionsPage";
import NotificationsPage from "../pages/NotificationsPage";
import Settings from "../pages/Settings";
import PaymentPage from "../pages/PaymentPage";
import ReceivePage from "../pages/ReceivePage";
import Cards from "../pages/Cards";
import BillPayments from "../pages/BillPayments";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/" element={<Onboarding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/pay/:id" element={<PaymentPage />} />

              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/receive" element={<ReceivePage />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/cards" element={<Cards />} />
                <Route path="/bill-payments" element={<BillPayments />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
