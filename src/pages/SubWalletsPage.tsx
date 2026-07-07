import { useEffect, useState } from "react";
import { PiggyBank, Plus, ArrowRight, ArrowLeft, PauseCircle, PlayCircle, XCircle, Target, Trash2, Gift } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { formatCurrency, formatDate } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import {
  getSubWallets, createSubWallet, transferToSubWallet, withdrawFromSubWallet,
  completeSubWallet, deleteSubWallet,
  getSavingsPlans, createSavingsPlan, cancelSavingsPlan,
} from "../services/subWallets";
import type { SubWallet, SavingsPlan } from "../types";

type Modal = "create" | "fund" | "withdraw" | "plan-create" | null;

const iconOptions = ["Target", "PiggyBank", "Gift", "Wallet", "Star"];
const presetColors = ["#EAB308", "#3B82F6", "#EF4444", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#06B6D4"];

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function SubWalletsPage() {
  const { organization } = useAuth();
  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<SavingsPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [selectedColor, setSelectedColor] = useState(presetColors[0]);
  const [selectedIcon, setSelectedIcon] = useState(iconOptions[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sw, sp] = await Promise.all([getSubWallets(organization?.id), getSavingsPlans()]);
    setSubWallets(sw);
    setSavingsPlans(sp);
    setLoading(false);
  };

  const resetModal = () => {
    setModal(null);
    setSelectedId(null);
    setName("");
    setTargetAmount("");
    setGoalDate("");
    setSelectedColor(presetColors[0]);
    setSelectedIcon(iconOptions[0]);
    setAmount("");
    setNote("");
    setFrequency("monthly");
    setSaving(false);
    setError("");
  };

  const handleCreate = async () => {
    if (!name) return;
    setSaving(true); setError("");
    const { error: err } = await createSubWallet({
      name, targetAmount: targetAmount ? Number(targetAmount) : undefined,
      color: selectedColor, icon: selectedIcon,
      goalDate: goalDate || undefined,
      organizationId: organization?.id,
    });
    setSaving(false);
    if (err) { setError(err); return; }
    loadData(); resetModal();
  };

  const handleFund = async () => {
    if (!selectedId || !amount) return;
    setSaving(true); setError("");
    const { error: err } = await transferToSubWallet(selectedId, Number(amount), note || undefined);
    setSaving(false);
    if (err) { setError(err); return; }
    loadData(); resetModal();
  };

  const handleWithdraw = async () => {
    if (!selectedId || !amount) return;
    setSaving(true); setError("");
    const { error: err } = await withdrawFromSubWallet(selectedId, Number(amount), note || undefined);
    setSaving(false);
    if (err) { setError(err); return; }
    loadData(); resetModal();
  };

  const handleCreatePlan = async () => {
    if (!selectedId || !amount) return;
    setSaving(true); setError("");
    const { error: err } = await createSavingsPlan({
      subWalletId: selectedId, amount: Number(amount), frequency: frequency as any,
    });
    setSaving(false);
    if (err) { setError(err); return; }
    loadData(); resetModal();
  };

  const progress = (bal: number, target: number | null) =>
    target ? Math.min((bal / target) * 100, 100) : bal > 0 ? 100 : 0;

  const getPlansForWallet = (id: string) => savingsPlans.filter((p) => p.sub_wallet_id === id);

  const frequencyLabel = (f: string) => frequencyOptions.find((o) => o.value === f)?.label || f;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      paused: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
      completed: "bg-blue-100 text-blue-700",
    };
    return map[status] || "bg-gray-100 text-gray-500";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-gray-500 text-sm mt-1">Set aside money for what matters</p>
        </div>
        {!modal && (
          <Button onClick={() => setModal("create")}>
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        )}
      </div>

      {modal === "create" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Create Savings Goal</h3>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Name</label>
              <Input placeholder="e.g. New Laptop" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Target Amount (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
                  <Input type="number" placeholder="0.00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="pl-8" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Goal Date (optional)</label>
                <Input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Icon</label>
              <div className="flex gap-2">
                {iconOptions.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setSelectedIcon(ic)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                      selectedIcon === ic ? "border-brand-yellow bg-brand-yellow/10" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {ic === "Target" && <Target className="w-5 h-5" />}
                    {ic === "PiggyBank" && <PiggyBank className="w-5 h-5" />}
                    {ic === "Gift" && <Gift className="w-5 h-5" />}
                    {ic === "Wallet" && <PiggyBank className="w-5 h-5" />}
                    {ic === "Star" && <Target className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Color</label>
              <div className="flex gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColor === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetModal} className="flex-1">Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !name} className="flex-1">
                {saving ? "..." : "Create Goal"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {modal === "fund" && selectedId && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Add Money to Goal</h3>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8 text-lg font-semibold" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Note (optional)</label>
              <Input placeholder="e.g. Weekly savings" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetModal} className="flex-1">Cancel</Button>
              <Button onClick={handleFund} disabled={saving || !amount || Number(amount) <= 0} className="flex-1">
                {saving ? "..." : "Add Money"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {modal === "withdraw" && selectedId && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Withdraw from Goal</h3>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8 text-lg font-semibold" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Note (optional)</label>
              <Input placeholder="e.g. Emergency expense" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetModal} className="flex-1">Cancel</Button>
              <Button onClick={handleWithdraw} disabled={saving || !amount || Number(amount) <= 0} className="flex-1">
                {saving ? "..." : "Withdraw"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {modal === "plan-create" && selectedId && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Auto-Save Plan</h3>
            <p className="text-sm text-gray-500">Regularly move money into this goal.</p>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Amount per transfer</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8 text-lg font-semibold" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {frequencyOptions.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFrequency(f.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      frequency === f.value
                        ? "bg-brand-yellow/10 border-brand-yellow text-brand-yellow-dark"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetModal} className="flex-1">Cancel</Button>
              <Button onClick={handleCreatePlan} disabled={saving || !amount || Number(amount) <= 0} className="flex-1">
                {saving ? "..." : "Create Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {subWallets.length === 0 && !modal ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <PiggyBank className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No savings goals yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create a goal and start saving toward what matters</p>
            <Button onClick={() => setModal("create")}>
              <Plus className="w-4 h-4" />
              New Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {subWallets.map((sw) => {
            const pct = progress(sw.current_balance, sw.target_amount);
            const plans = getPlansForWallet(sw.id);
            const isExpanded = expandedId === sw.id;
            return (
              <Card key={sw.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sw.color }} />
                        <p className="font-semibold">{sw.name}</p>
                        <Badge className={statusBadge(sw.status)}>{sw.status}</Badge>
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(sw.current_balance)}</p>
                      {sw.target_amount && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Goal: {formatCurrency(sw.target_amount)}
                          {sw.goal_date && ` · by ${formatDate(sw.goal_date)}`}
                        </p>
                      )}
                      {sw.target_amount && (
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: sw.color }} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {sw.status === "active" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedId(sw.id); setModal("fund"); }}>
                            <ArrowRight className="w-4 h-4 text-emerald-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedId(sw.id); setModal("withdraw"); }}>
                            <ArrowLeft className="w-4 h-4 text-amber-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedId(sw.id); setModal("plan-create"); }}>
                            <Plus className="w-4 h-4 text-blue-500" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : sw.id)}>
                        <Target className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={async () => { await deleteSubWallet(sw.id); loadData(); }}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Auto-Save Plans</h4>
                        {sw.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedId(sw.id); setModal("plan-create"); }}>
                            <Plus className="w-3.5 h-3.5" />
                            Plan
                          </Button>
                        )}
                      </div>
                      {plans.length === 0 ? (
                        <p className="text-xs text-gray-400">No auto-save plans for this goal.</p>
                      ) : (
                        plans.map((p) => (
                          <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{formatCurrency(p.amount)} / {frequencyLabel(p.frequency)}</p>
                              <p className="text-xs text-gray-400">
                                Next: {formatDate(p.next_run)} · {p.total_executions} saved · Total: {formatCurrency(p.total_saved)}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {p.status === "active" && (
                                <Button variant="ghost" size="sm" onClick={() => cancelSavingsPlan(p.id, "paused").then(loadData)}>
                                  <PauseCircle className="w-4 h-4 text-amber-500" />
                                </Button>
                              )}
                              {p.status === "paused" && (
                                <Button variant="ghost" size="sm" onClick={() => cancelSavingsPlan(p.id, "active").then(loadData)}>
                                  <PlayCircle className="w-4 h-4 text-emerald-500" />
                                </Button>
                              )}
                              {(p.status === "active" || p.status === "paused") && (
                                <Button variant="ghost" size="sm" onClick={() => cancelSavingsPlan(p.id, "cancelled").then(loadData)}>
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
