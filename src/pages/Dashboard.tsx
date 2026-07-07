import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, Send, ArrowDownToLine, TrendingUp, Users,
  CreditCard, ArrowUpRight, Copy, Sparkles, Brain,
  PiggyBank, BarChart3, Lightbulb, Zap, Eye, EyeOff, X, Bell,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { getWallet, getTransactions } from "../services/wallet";
import { getVirtualAccount, createVirtualAccount } from "../services/virtualAccount";
import { getAnalytics } from "../services/analytics";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useRealtimeWallet } from "../services/realtime";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import BudgetsWidget from "../components/BudgetsWidget";
import SubWalletsWidget from "../components/SubWalletsWidget";
import type { Wallet as WalletType, Transaction, Analytics } from "../types";

const chartData = [
  { name: "Mon", value: 12000 }, { name: "Tue", value: 19000 },
  { name: "Wed", value: 15000 }, { name: "Thu", value: 28000 },
  { name: "Fri", value: 22000 }, { name: "Sat", value: 18000 },
  { name: "Sun", value: 25000 },
];

const COLORS = ["#EAB308", "#0A0A0A", "#6B7280", "#FCD34D"];

function AiInsights({ balance, transactions, analyticsData }: { balance: number; transactions?: Transaction[]; analyticsData?: Analytics | null }) {
  const { t } = useLanguage();
  const insights: { icon: any; title: string; desc: string; color: string; bg: string }[] = [];

  const txCount = transactions?.length || 0;
  const totalSent = transactions?.filter(tx => tx.transaction_type === "transfer" || tx.transaction_type === "withdrawal").reduce((sum, tx) => sum + tx.amount, 0) || 0;
  const totalReceived = transactions?.filter(tx => tx.transaction_type === "deposit" || tx.transaction_type === "credit").reduce((sum, tx) => sum + tx.amount, 0) || 0;
  const recentTx = transactions?.[0];

  if (balance > 50000) {
    insights.push({ icon: PiggyBank, title: "Healthy Balance", desc: `Your wallet has ${formatCurrency(balance)}. Consider moving excess to savings.`, color: "text-emerald-600", bg: "bg-emerald-100" });
  } else if (balance < 1000) {
    insights.push({ icon: Lightbulb, title: "Low Balance Alert", desc: `Your balance is ${formatCurrency(balance)}. Fund your wallet to avoid declined transactions.`, color: "text-amber-600", bg: "bg-amber-100" });
  }

  if (totalSent > totalReceived && balance < 10000) {
    insights.push({ icon: TrendingUp, title: "Spending > Income", desc: `You've sent ${formatCurrency(totalSent)} but received ${formatCurrency(totalReceived)}. Consider reducing outflows.`, color: "text-red-600", bg: "bg-red-100" });
  } else if (txCount > 0) {
    insights.push({ icon: BarChart3, title: "Transaction Activity", desc: `${txCount} recent transactions. ${formatCurrency(totalReceived)} in, ${formatCurrency(totalSent)} out.`, color: "text-blue-600", bg: "bg-blue-100" });
  }

  if (recentTx) {
    const daysSinceLastTx = Math.floor((Date.now() - new Date(recentTx.created_at).getTime()) / 86400000);
    if (daysSinceLastTx > 7) {
      insights.push({ icon: Zap, title: "Inactive Account", desc: `No transactions in ${daysSinceLastTx} days. Make a transfer or deposit to stay active.`, color: "text-purple-600", bg: "bg-purple-100" });
    }
  }

  if (analyticsData?.collectionRate !== undefined && analyticsData.collectionRate < 50) {
    insights.push({ icon: Brain, title: "Collection Rate Low", desc: `Only ${analyticsData.collectionRate}% of invoices collected. Follow up on outstanding payments.`, color: "text-purple-600", bg: "bg-purple-100" });
  } else if (analyticsData?.totalCustomers && analyticsData.totalCustomers > 0 && !analyticsData?.activeAccounts) {
    insights.push({ icon: Users, title: "Customers Without Accounts", desc: "Some customers don't have virtual accounts yet. Generate accounts for them.", color: "text-purple-600", bg: "bg-purple-100" });
  }

  if (insights.length === 0) {
    insights.push({ icon: Sparkles, title: "All Good!", desc: "Your wallet is in great shape. No issues detected.", color: "text-green-600", bg: "bg-green-100" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-brand-yellow" />
        <span className="text-sm font-semibold text-gray-900">{t("common.aiInsights")}</span>
      </div>
      {insights.slice(0, 3).map((insight, idx) => {
        const Icon = insight.icon;
        return (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100/60/60 transition-colors group cursor-default">
            <div className={`w-9 h-9 rounded-lg ${insight.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
              <Icon className={`w-4 h-4 ${insight.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{insight.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{insight.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { organization, user, profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analyticsData, setAnalyticsData] = useState<Analytics | null>(null);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    const [w, va, tx] = await Promise.all([
      getWallet(organization?.id), getVirtualAccount(organization?.id), getTransactions(10, organization?.id),
    ]);
    setWallet(w); setVirtualAccount(va); setTransactions(tx);

    if (organization?.id) {
      const a = await getAnalytics(organization.id);
      setAnalyticsData(a);
    }
  }, [organization?.id]);

  useEffect(() => { loadData(); }, [loadData]);
  useRealtimeWallet(loadData);

  const handleCreateAccount = async () => {
    if (!user?.id) return;
    setCreating(true);
    try {
      const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
      await createVirtualAccount(user.id, userName, organization?.id, undefined, organization?.name);
      await loadData();
    } catch (err) { console.error(err); }
    setCreating(false);
  };

  const bal = Number(wallet?.available_balance || 0);
  const hasOrg = !!organization;
  const unreadCount = useUnreadCount();
  const [showBalance, setShowBalance] = useState(true);
  const [showFundModal, setShowFundModal] = useState(false);

  return (
    <div className="space-y-6">
      {!hasOrg ? (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-black via-brand-black to-gray-900 p-6 md:p-8 text-white shadow-xl shadow-black/10">
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand-yellow/5 rounded-full -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-brand-yellow/[0.03] rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/[0.02] rounded-full blur-xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Wallet className="w-4 h-4" />
                  <span>{t("dash.availableBalance")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate("/notifications")} className="relative text-gray-400 hover:text-white transition-colors">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none shadow-sm shadow-red-500/50">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <button onClick={() => setShowBalance(!showBalance)} className="text-gray-400 hover:text-white transition-colors">
                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <Badge variant="premium" className="bg-white/10 text-gray-300 border-0 text-[10px]">{t("dash.live")}</Badge>
                </div>
              </div>
              <div className="text-4xl md:text-5xl font-bold tracking-tight mb-1 animate-count-up">
                {showBalance ? formatCurrency(bal) : "****"}
              </div>
              <div className="text-gray-500 text-sm">
                {t("dash.ledgerBalance")}: {showBalance ? formatCurrency(Number(wallet?.ledger_balance || 0)) : "****"}
              </div>
              {virtualAccount && (
                <div className="mt-5 flex items-center gap-3 flex-wrap">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2.5 border border-white/5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">{t("dash.account")}</span>
                    <span className="text-sm font-mono font-bold tracking-wider text-white">{virtualAccount.account_number}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(virtualAccount.account_number)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Copy account number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">{virtualAccount.bank_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ActionCard icon={ArrowDownToLine} label={t("dash.receive")} desc={t("dash.receiveDesc")} onClick={() => navigate("/receive")} />
            <ActionCard icon={Wallet} label="Fund Wallet" desc="Deposit via bank transfer" onClick={() => setShowFundModal(true)} />
            <ActionCard icon={Send} label={t("dash.transfer")} desc={t("dash.transferDesc")} onClick={() => navigate("/transfers")} />
            <ActionCard icon={Zap} label="Bill Payments" desc="Airtime, data, electricity" onClick={() => navigate("/bill-payments")} />
            <ActionCard icon={CreditCard} label={t("dash.cards")} desc={t("dash.cardsDesc")} onClick={() => navigate("/cards")} />
            <ActionCard icon={TrendingUp} label={t("dash.statement")} desc={t("dash.statementDesc")} onClick={() => navigate("/transactions")} />
          </div>

          {/* Fund Wallet Modal */}
          {showFundModal && virtualAccount && (
            <div className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center" onClick={() => setShowFundModal(false)}>
              <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 z-50 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Fund Wallet</h3>
                  <button onClick={() => setShowFundModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Transfer to the account below to fund your wallet. Funds are credited automatically.
                </p>
                <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Bank</p>
                    <p className="font-semibold">{virtualAccount.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Account Number</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold font-mono tracking-wider">{virtualAccount.account_number}</p>
                      <button onClick={() => { navigator.clipboard.writeText(virtualAccount.account_number || ""); }} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Account Name</p>
                    <p className="font-medium">{virtualAccount.account_name}</p>
                  </div>
                </div>
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  Only transfer from your personal bank account. Third-party transfers may be rejected.
                </div>
                <Button className="w-full mt-4" onClick={() => setShowFundModal(false)}>Done</Button>
              </div>
            </div>
          )}

          {!virtualAccount && (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-yellow/20 to-amber-500/10 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <ArrowDownToLine className="w-10 h-10 text-brand-yellow" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t("dash.noAccount")}</h3>
                <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
                  {t("dash.noAccountDesc")}
                </p>
                <Button size="lg" loading={creating} onClick={handleCreateAccount} className="shadow-lg shadow-brand-yellow/20">
                  {t("dash.generateAccount")}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t("dash.recentTx")}</CardTitle>
                {transactions.length > 0 && (
                  <button
                    onClick={() => navigate("/transactions")}
                    className="text-sm text-brand-yellow-dark hover:text-brand-yellow font-medium"
                  >
                    {t("dash.seeAll")}
                  </button>
                )}
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <BarChart3 className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-sm">{t("dash.noTx")}</p>
                    <p className="text-gray-300 text-xs mt-1">{t("dash.noTxDesc")}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/50 transition-all group">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                          tx.transaction_type === "deposit" ? "bg-emerald-100" : "bg-red-100"
                        )}>
                          {tx.transaction_type === "deposit"
                            ? <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                            : <ArrowUpRight className="w-5 h-5 text-red-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize truncate text-gray-900">
                            {tx.narration || tx.transaction_type}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn(
                            "text-sm font-bold",
                            tx.transaction_type === "deposit" ? "text-emerald-600" : "text-red-500"
                          )}>
                            {tx.transaction_type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </p>
                          <Badge variant={tx.status === "success" ? "success" : "warning"} className="text-[10px] px-1.5 py-0">
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("dash.weeklyActivity")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#EAB308" strokeWidth={2} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <BudgetsWidget />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <SubWalletsWidget />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <AiInsights balance={bal} transactions={transactions} analyticsData={analyticsData} />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Wallet}
              label="Balance"
              value={formatCurrency(bal)}
              trend="+12.5%"
              positive
            />
            <StatCard
              icon={TrendingUp}
              label="Revenue"
              value={formatCurrency(analyticsData?.totalRevenue || 0)}
              trend="+8.2%"
              positive
            />
            <StatCard
              icon={Users}
              label="Customers"
              value={String(analyticsData?.totalCustomers || 0)}
              trend="+3"
              positive
            />
            <StatCard
              icon={CreditCard}
              label="Collection"
              value={`${analyticsData?.collectionRate || 0}%`}
              trend="+5.1%"
              positive
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }} />
                      <Area type="monotone" dataKey="value" stroke="#EAB308" strokeWidth={2} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Deposits", value: 65 },
                          { name: "Transfers", value: 20 },
                          { name: "Fees", value: 10 },
                          { name: "Other", value: 5 },
                        ]}
                        cx="50%" cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {COLORS.map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {["Deposits", "Transfers", "Fees", "Other"].map((name, i) => (
                    <div key={name} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      {name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t("dash.recentTx")}</CardTitle>
                <button onClick={() => navigate("/transactions")} className="text-sm text-brand-yellow-dark font-medium">{t("dash.seeAll")}</button>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">{t("dash.noTx")}</p>
                ) : (
                  <div className="space-y-1">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/50 transition-all group">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tx.transaction_type === "deposit" ? "bg-emerald-100" : "bg-red-100")}>
                          {tx.transaction_type === "deposit" ? <ArrowDownToLine className="w-5 h-5 text-emerald-600" /> : <ArrowUpRight className="w-5 h-5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize truncate text-gray-900">{tx.narration || tx.transaction_type}</p>
                          <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("text-sm font-bold", tx.transaction_type === "deposit" ? "text-emerald-600" : "text-red-500")}>
                            {tx.transaction_type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-brand-yellow-dark" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Total Customers</p>
                          <p className="text-xs text-gray-400">Active accounts</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold">{analyticsData?.totalCustomers || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Active Accounts</p>
                          <p className="text-xs text-gray-400">Virtual accounts</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold">{analyticsData?.activeAccounts || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Outstanding</p>
                          <p className="text-xs text-gray-400">Unpaid invoices</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-amber-600">{formatCurrency(analyticsData?.outstanding || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <BudgetsWidget />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <SubWalletsWidget />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <AiInsights balance={bal} transactions={transactions} analyticsData={analyticsData} />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, positive }: {
  icon: any; label: string; value: string; trend?: string; positive?: boolean;
}) {
  return (
    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-yellow/20 to-amber-500/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-brand-yellow-dark" />
          </div>
          {trend && (
            <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full", positive ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50")}>
              {trend}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden flex flex-col items-center gap-2 p-4 md:p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-gradient-to-br group-hover:from-brand-yellow/20 group-hover:to-amber-500/10 flex items-center justify-center transition-all duration-200">
        <Icon className="w-6 h-6 text-gray-600 group-hover:text-brand-yellow-dark transition-colors" />
      </div>
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <span className="text-[10px] text-gray-400 -mt-1">{desc}</span>
    </button>
  );
}
