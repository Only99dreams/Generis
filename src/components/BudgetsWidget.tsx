import { useEffect, useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { createBudget, getBudgets, refreshBudgetSpending, deleteBudget } from "../services/budgets";
import { formatCurrency } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import type { Budget } from "../types";

const categoryOptions = [
  { value: "all", label: "All Spending", color: "#EAB308" },
  { value: "transfer", label: "Transfers", color: "#3B82F6" },
  { value: "withdrawal", label: "Withdrawals", color: "#EF4444" },
  { value: "bill_payment", label: "Bills", color: "#8B5CF6" },
  { value: "fee", label: "Fees", color: "#6B7280" },
];

const presetColors = ["#EAB308", "#3B82F6", "#EF4444", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#06B6D4"];

export default function BudgetsWidget() {
  const { organization } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("all");
  const [amount, setAmount] = useState("");
  const [selectedColor, setSelectedColor] = useState(presetColors[0]);
  const [period, setPeriod] = useState<string>("monthly");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    const data = await getBudgets(organization?.id);
    setBudgets(data);
    setLoading(false);
  };

  const handleRefresh = async () => {
    const data = await refreshBudgetSpending(organization?.id);
    if (data.length > 0) setBudgets(data);
    else loadBudgets();
  };

  const handleCreate = async () => {
    if (!name || !amount) return;
    setSaving(true);
    setError("");

    const { data, error: err } = await createBudget({
      name,
      category,
      amount: parseFloat(amount),
      period: period as any,
      color: selectedColor,
      organizationId: organization?.id,
    });

    setSaving(false);

    if (err) {
      setError(err);
      return;
    }

    loadBudgets();
    setShowForm(false);
    setName("");
    setAmount("");
    setCategory("all");
  };

  const handleDelete = async (id: string) => {
    await deleteBudget(id);
    loadBudgets();
  };

  const progress = (spent: number, total: number) => Math.min((spent / total) * 100, 100);
  const isOverBudget = (spent: number, total: number) => spent > total;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="w-4 h-4" />
          Budgets
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh}>Refresh</Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-brand-yellow/30">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Name</label>
              <Input placeholder="e.g. Monthly Rent" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">Budget Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8" />
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
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving || !name || !amount} className="flex-1">
                {saving ? "..." : "Save Budget"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgets.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 text-center py-4">No budgets yet. Create one to track your spending.</p>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const pct = progress(b.spent, b.amount);
            const over = isOverBudget(b.spent, b.amount);
            return (
              <div key={b.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="text-sm font-medium truncate">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium ${over ? "text-red-500" : "text-gray-500"}`}>
                      {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-500" : ""}`}
                    style={{ width: `${pct}%`, backgroundColor: over ? undefined : b.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
