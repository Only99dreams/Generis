import { useEffect, useState } from "react";
import { Clock, Plus, PauseCircle, PlayCircle, XCircle, Calendar, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import BankSelectSheet from "../components/BankSelectSheet";
import { formatCurrency, formatDate } from "../lib/utils";
import { getScheduledTransfers, createScheduledTransfer, cancelScheduledTransfer } from "../services/scheduledTransfers";
import { verifyBankAccount, saveBeneficiary, getBeneficiaries } from "../services/transfers";
import type { ScheduledTransfer } from "../types";
import type { Bank } from "../data/banks";
import { supabase } from "../services/supabase";

type Step = "form" | "schedule" | "confirm" | "success";

export default function ScheduledTransfersPage() {
  const { organization, user } = useAuth();

  const [schedules, setSchedules] = useState<ScheduledTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>("form");
  const [showForm, setShowForm] = useState(false);

  const [accountNumber, setAccountNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "once">("monthly");
  const [intervalDay, setIntervalDay] = useState(1);
  const [intervalWeekday, setIntervalWeekday] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [banks, setBanks] = useState<Bank[] | undefined>(undefined);

  const amountNum = Number(amount) || 0;

  useEffect(() => {
    loadSchedules();
    supabase.functions.invoke("fetch-banks").then(({ data }) => {
      if (data?.banks?.length) setBanks(data.banks as Bank[]);
    }).catch(() => {});
  }, []);

  const loadSchedules = async () => {
    const data = await getScheduledTransfers();
    setSchedules(data);
    setLoading(false);
  };

  const handleAccountSubmit = () => {
    if (accountNumber.length !== 10) return;
    setBankSheetOpen(true);
  };

  const handleBankSelect = async (bank: Bank) => {
    setSelectedBank(bank);
    setAccountName("");
    setVerifyError("");
    setBankSheetOpen(false);

    setVerifying(true);
    const { data, error: err } = await verifyBankAccount(accountNumber, bank.code);
    setVerifying(false);

    if (err || !data?.accountName) {
      setVerifyError(err || "Could not verify account");
      return;
    }
    setAccountName(data.accountName);
  };

  const resetForm = () => {
    setStep("form");
    setAccountNumber("");
    setSelectedBank(null);
    setAccountName("");
    setAmount("");
    setNarration("");
    setFrequency("monthly");
    setIntervalDay(1);
    setIntervalWeekday(1);
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setVerifyError("");
    setError("");
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!selectedBank || !accountName || !amountNum) return;
    setSaving(true);
    setError("");

    const { data, error: err } = await createScheduledTransfer({
      beneficiaryName: accountName,
      beneficiaryAccount: accountNumber,
      bankCode: selectedBank.code,
      bankName: selectedBank.name,
      amount: amountNum,
      narration: narration || undefined,
      frequency,
      intervalDay: frequency === "monthly" ? intervalDay : undefined,
      intervalWeekday: frequency === "weekly" ? intervalWeekday : undefined,
      startDate,
      endDate: endDate || undefined,
      organizationId: organization?.id || undefined,
    });

    setSaving(false);

    if (err) {
      setError(err);
      return;
    }

    setStep("success");
    loadSchedules();
  };

  const frequencyLabel = (f: string) => {
    const map: Record<string, string> = {
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      once: "One-time",
    };
    return map[f] || f;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700",
      paused: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
      completed: "bg-blue-100 text-blue-700",
    };
    return map[status] || "bg-gray-100 text-gray-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scheduled Transfers</h1>
          <p className="text-gray-500 text-sm mt-1">Set up recurring bank transfers</p>
        </div>
        {!showForm && (
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            New Schedule
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <h3 className="font-semibold">Create Scheduled Transfer</h3>

            {step === "success" ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-lg">Scheduled!</h4>
                <p className="text-gray-500 text-sm mt-1">
                  {frequencyLabel(frequency)} transfer of {formatCurrency(amountNum)} to {accountName} has been scheduled.
                </p>
                <Button variant="outline" className="mt-4" onClick={resetForm}>
                  Create Another
                </Button>
              </div>
            ) : (
              <>
                {step === "form" && (
                  <>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                        Account Number
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type="text"
                            placeholder="0123456789"
                            maxLength={10}
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                            onKeyDown={(e) => e.key === "Enter" && handleAccountSubmit()}
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleAccountSubmit}
                          disabled={accountNumber.length !== 10}
                        >
                          {selectedBank ? "Change" : "Select Bank"}
                        </Button>
                      </div>
                    </div>

                    {selectedBank && (
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                          Bank
                        </label>
                        <p className="text-sm font-medium">{selectedBank.name}</p>
                      </div>
                    )}

                    {verifying && (
                      <p className="text-sm text-gray-400">Verifying account...</p>
                    )}

                    {verifyError && (
                      <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{verifyError}</p>
                    )}

                    {accountName && !verifying && (
                      <>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                          <p className="text-xs text-emerald-600 uppercase tracking-wider font-medium">Account Name</p>
                          <p className="text-lg font-bold text-emerald-800">{accountName}</p>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                            Amount
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₦</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="pl-8 text-lg font-semibold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                            Narration (optional)
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. Monthly rent"
                            value={narration}
                            onChange={(e) => setNarration(e.target.value)}
                          />
                        </div>

                        <Button onClick={() => setStep("schedule")} className="w-full">
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    <BankSelectSheet
                      open={bankSheetOpen}
                      onClose={() => setBankSheetOpen(false)}
                      onSelect={handleBankSelect}
                      banks={banks}
                    />
                  </>
                )}

                {step === "schedule" && (
                  <>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                        Frequency
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["daily", "weekly", "monthly", "once"].map((f) => (
                          <button
                            key={f}
                            onClick={() => setFrequency(f as any)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                              frequency === f
                                ? "bg-brand-yellow/10 border-brand-yellow text-brand-yellow-dark"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {frequencyLabel(f)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {frequency === "monthly" && (
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                          Day of Month
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          value={intervalDay}
                          onChange={(e) => setIntervalDay(Number(e.target.value) || 1)}
                        />
                      </div>
                    )}

                    {frequency === "weekly" && (
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                          Day of Week
                        </label>
                        <div className="grid grid-cols-7 gap-1">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                            <button
                              key={d}
                              onClick={() => setIntervalWeekday(i)}
                              className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                                intervalWeekday === i
                                  ? "bg-brand-yellow/10 border-brand-yellow text-brand-yellow-dark"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                          End Date (optional)
                        </label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {frequency === "once" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <p className="text-sm text-amber-700">
                          A one-time transfer will be processed at the next scheduled run. Future transfers will not recur.
                        </p>
                      </div>
                    )}

                    {error && (
                      <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                        Back
                      </Button>
                      <Button onClick={handleSave} disabled={saving} className="flex-1">
                        {saving ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Schedule Transfer"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schedules.length === 0 && !showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No scheduled transfers</h3>
            <p className="text-gray-500 text-sm mb-4">Set up automatic recurring transfers</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4" />
              Schedule Transfer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {schedules.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{formatCurrency(s.amount)}</p>
                      <Badge className={statusBadge(s.status)}>{s.status}</Badge>
                      <Badge variant="default">{frequencyLabel(s.frequency)}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      To: {s.beneficiary_name} · {s.beneficiary_account} · {s.bank_name}
                    </p>
                    {s.narration && (
                      <p className="text-xs text-gray-400 mt-0.5">{s.narration}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>Next: {formatDate(s.next_run)}</span>
                      {s.last_run && <span>· Last: {formatDate(s.last_run)}</span>}
                      <span>· {s.total_executions} executed</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {s.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelScheduledTransfer(s.id, "paused").then(loadSchedules)}
                      >
                        <PauseCircle className="w-4 h-4 text-amber-500" />
                      </Button>
                    )}
                    {s.status === "paused" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelScheduledTransfer(s.id, "active").then(loadSchedules)}
                      >
                        <PlayCircle className="w-4 h-4 text-emerald-500" />
                      </Button>
                    )}
                    {(s.status === "active" || s.status === "paused") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelScheduledTransfer(s.id, "cancelled").then(loadSchedules)}
                      >
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
