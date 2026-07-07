import { useEffect, useState } from "react";
import { Repeat, Plus, PauseCircle, PlayCircle, XCircle, CreditCard } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { formatCurrency, formatDate } from "../lib/utils";
import { getSubscriptions, createSubscription, cancelSubscription } from "../services/subscriptions";
import { getSavedCards } from "../services/cards";
import { useAuth } from "../context/AuthContext";
import type { Subscription, SavedCard } from "../types";

type Step = "form" | "confirm";

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<Step>("form");

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [description, setDescription] = useState("");
  const [billingDay, setBillingDay] = useState(new Date().getDate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [subs, savedCards] = await Promise.all([
      getSubscriptions(),
      user?.id ? getSavedCards(user.id) : Promise.resolve([]),
    ]);
    setSubscriptions(subs);
    setCards(savedCards.filter((c) => c.provider_ref));
    setLoading(false);
  };

  const resetForm = () => {
    setStep("form");
    setSelectedCardId("");
    setName("");
    setAmount("");
    setFrequency("monthly");
    setDescription("");
    setBillingDay(new Date().getDate());
    setError("");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!selectedCardId || !name || !amount) return;
    setSaving(true);
    setError("");

    const { data, error: err } = await createSubscription({
      savedCardId: selectedCardId,
      name,
      amount: parseFloat(amount),
      frequency: frequency as any,
      description: description || undefined,
      billingDay,
    });

    setSaving(false);

    if (err) {
      setError(err);
      return;
    }

    loadData();
    resetForm();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      paused: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-500",
    };
    return map[status] || "bg-gray-100 text-gray-500";
  };

  const frequencyLabel = (f: string) => frequencyOptions.find((o) => o.value === f)?.label || f;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-gray-500 text-sm mt-1">Recurring card payments</p>
        </div>
        {!showForm && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} disabled={cards.length === 0}>
            <Plus className="w-4 h-4" />
            New Subscription
          </Button>
        )}
      </div>

      {cards.length === 0 && !showForm && (
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <p className="text-gray-500 text-sm mb-2">You need a tokenized card first</p>
            <Button variant="outline" onClick={() => window.location.href = "/cards"}>
              <CreditCard className="w-4 h-4" />
              Go to Cards
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Create Subscription</h3>

            {step === "form" && (
              <>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                    Saved Card
                  </label>
                  <div className="grid gap-2">
                    {cards.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCardId(c.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                          selectedCardId === c.id
                            ? "border-brand-yellow bg-brand-yellow/5"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{c.card_brand} ****{c.last4}</p>
                          <p className="text-xs text-gray-400">Expires {c.exp_month}/{c.exp_year}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                    Subscription Name
                  </label>
                  <Input placeholder="e.g. Netflix Premium" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
                    <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8 text-lg font-semibold" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                    Frequency
                  </label>
                  <div className="grid grid-cols-4 gap-2">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      Billing Day
                    </label>
                    <Input type="number" min={1} max={28} value={billingDay} onChange={(e) => setBillingDay(Number(e.target.value) || 1)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      Description (optional)
                    </label>
                    <Input placeholder="e.g. Monthly plan" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <Button onClick={handleCreate} disabled={saving || !selectedCardId || !name || !amount} className="w-full">
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Create Subscription"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subscriptions.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Repeat className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No subscriptions</h3>
            <p className="text-gray-500 text-sm mb-4">Set up recurring payments for your subscriptions</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }} disabled={cards.length === 0}>
              <Plus className="w-4 h-4" />
              New Subscription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {subscriptions.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{s.name}</p>
                      <Badge className={statusBadge(s.status)}>{s.status}</Badge>
                      <Badge variant="default">{frequencyLabel(s.frequency)}</Badge>
                    </div>
                    <p className="text-lg font-bold text-brand-yellow-dark">{formatCurrency(s.amount)}</p>
                    {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                    {s.saved_cards && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Card: {s.saved_cards.card_brand} ****{s.saved_cards.last4}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>Next: {formatDate(s.next_billing_date)}</span>
                      {s.last_billing_date && <span>· Last: {formatDate(s.last_billing_date)}</span>}
                      <span>· {s.total_charges} charges</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {s.status === "active" && (
                      <Button variant="ghost" size="sm" onClick={() => cancelSubscription(s.id, "paused").then(loadData)}>
                        <PauseCircle className="w-4 h-4 text-amber-500" />
                      </Button>
                    )}
                    {s.status === "paused" && (
                      <Button variant="ghost" size="sm" onClick={() => cancelSubscription(s.id, "active").then(loadData)}>
                        <PlayCircle className="w-4 h-4 text-emerald-500" />
                      </Button>
                    )}
                    {(s.status === "active" || s.status === "paused") && (
                      <Button variant="ghost" size="sm" onClick={() => cancelSubscription(s.id, "cancelled").then(loadData)}>
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
