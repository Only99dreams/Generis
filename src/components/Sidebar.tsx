import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, CreditCard, Receipt, Send,
  Bell, Settings, LogOut, ChevronDown, Menu, X, Wallet, Building2,
  ArrowLeftRight, ArrowDownToLine, Sparkles, Globe, Link as LinkIcon, Clock, Repeat, PiggyBank,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useMobile } from "../hooks/useMobile";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { cn } from "../lib/utils";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import LanguageSwitcher from "./LanguageSwitcher";

const individualNav = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/receive", label: "Receive", icon: ArrowDownToLine },
  { path: "/payment-links", label: "Payment Links", icon: LinkIcon },
  { path: "/cards", label: "Cards", icon: CreditCard },
  { path: "/bill-payments", label: "Bill Payments", icon: Receipt },
  { path: "/transactions", label: "Statement", icon: ArrowLeftRight },
  { path: "/transfers", label: "Transfers", icon: Send },
  { path: "/subscriptions", label: "Subscription", icon: Repeat },
  { path: "/scheduled-transfers", label: "Scheduled", icon: Clock },
  { path: "/sub-wallets", label: "Savings Goals", icon: PiggyBank },
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/settings", label: "Settings", icon: Settings },
];

const orgNav = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/invoices", label: "Invoices", icon: FileText },
  { path: "/payments", label: "Payments", icon: Receipt },
  { path: "/payment-links", label: "Payment Links", icon: LinkIcon },
  { path: "/transactions", label: "Statement", icon: ArrowLeftRight },
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const { organization, organizations, setOrganization, signOut, profile, user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navItems = organization ? orgNav : individualNav;
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const unreadCount = useUnreadCount();

  const getLabel = (path: string) => {
    const map: Record<string, string> = {
      "/dashboard": t("nav.dashboard"),
      "/receive": t("nav.receive"),
      "/payment-links": "Payment Links",
      "/cards": t("nav.cards"),
      "/bill-payments": t("nav.billPayments"),
      "/transactions": t("nav.statement"),
      "/transfers": t("nav.transfers"),
      "/subscriptions": "Subscriptions",
      "/scheduled-transfers": "Scheduled Transfers",
      "/sub-wallets": "Savings Goals",
      "/notifications": t("nav.notifications"),
      "/settings": t("nav.settings"),
      "/customers": t("nav.customers"),
      "/invoices": t("nav.invoices"),
      "/payments": t("nav.payments"),
      "/payment-links": "Payment Links",
      "/receipts": t("nav.receipts"),
    };
    return map[path] || path;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-yellow to-amber-500 flex items-center justify-center shadow-lg shadow-brand-yellow/20">
            <Wallet className="w-5 h-5 text-brand-black" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Generis</h2>
            <p className="text-gray-500 text-xs">Fintech Platform</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-gray-800/60">
        <button
          onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-white font-medium truncate">
              {organization?.name || t("nav.personal")}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${showOrgSwitcher ? "rotate-180" : ""}`} />
        </button>
        {showOrgSwitcher && (
          <div className="mt-1 mx-1 bg-gray-800/80 rounded-lg p-1 space-y-0.5 border border-gray-700/50">
            <button
              onClick={() => { setOrganization(null); setShowOrgSwitcher(false); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                !organization ? "bg-brand-yellow/10 text-brand-yellow" : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              )}
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" />
                <span>{t("nav.personal")}</span>
              </div>
            </button>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => { setOrganization(org); setShowOrgSwitcher(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  organization?.id === org.id ? "bg-brand-yellow/10 text-brand-yellow" : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{org.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "text-brand-yellow bg-brand-yellow/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-yellow rounded-full shadow-sm shadow-brand-yellow/50" />
              )}
              <Icon className={cn("w-5 h-5 shrink-0", isActive && "drop-shadow-sm")} />
              <span>{getLabel(item.path)}</span>
              {item.path === "/notifications" && unreadCount > 0 && (
                <Badge variant="premium" className="ml-auto">{unreadCount}</Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800/60">
          <div className="flex items-center gap-3 mb-3 px-2">
            <Avatar name={profile?.full_name || user?.email || "U"} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-gray-500 text-xs truncate">
                {profile?.email || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1">
            <LanguageSwitcher />
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t("nav.signOut")}</span>
          </button>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const isMobile = useMobile();

  if (!isMobile) {
    return (
      <aside className="w-64 bg-brand-black border-r border-gray-800/60 flex-shrink-0 h-screen sticky top-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-yellow/[0.02] pointer-events-none" />
        <SidebarContent onClose={onClose} />
      </aside>
    );
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-brand-black border-r border-gray-800 z-50 animate-slide-up overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-yellow/[0.02] pointer-events-none" />
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}
