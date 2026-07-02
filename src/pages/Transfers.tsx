import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Check, Building2, Copy, Clock, ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { initiateTransfer, verifyBankAccount, saveBeneficiary, getBeneficiaries, getTransfers } from "../services/transfers";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import BankSelectSheet from "../components/BankSelectSheet";
import { formatCurrency, formatDate } from "../lib/utils";
import type { Beneficiary, Transfer } from "../types";
import type { Bank } from "../data/banks";
import { supabase } from "../services/supabase";

const TRANSFER_FEE_RATE = 0.01;

type Step = "account" | "amount" | "confirm" | "success";

export default function Transfers() {
  const { organization, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("account");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successRef, setSuccessRef] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [banks, setBanks] = useState<Bank[] | null>(null);

  const amountNum = Number(amount) || 0;
  const fee = Math.round(amountNum * TRANSFER_FEE_RATE);
  const total = amountNum + fee;

  const loadData = async () => {
    const [b, t] = await Promise.all([
      getBeneficiaries(),
      getTransfers(organization?.id || null),
    ]);
    setBeneficiaries(b as Beneficiary[]);
    setRecentTransfers(t as Transfer[]);
  };

  useEffect(() => {
    loadData();
    supabase.functions.invoke("fetch-banks").then(({ data, error }) => {
      if (data?.raw) console.log("Nomba raw response:", data.raw);
      if (!error && data?.banks?.length) setBanks(data.banks);
    }).catch(() => {});
  }, [organization?.id]);

  const resetForm = () => {
    setStep("account");
    setAccountNumber("");
    setSelectedBank(null);
    setAccountName("");
    setVerifyError("");
    setAmount("");
    setNarration("");
    setError("");
    setSuccessRef("");
  };

  const handleAccountSubmit = () => {
    if (accountNumber.length !== 10) return;
    setBankSheetOpen(true);
  };

  const handleBankSelect = async (bank: Bank) => {
    setSelectedBank(bank);
    setAccountName("");
    setVerifyError("");
    setVerifying(true);

    try {
      const result = await verifyBankAccount(accountNumber, bank.code, bank.name);
      setAccountName(result.accountName || "");
      setVerifyError("");
    } catch (err: any) {
      setVerifyError(err.message || "Could not verify account");
      setAccountName("");
    }
    setVerifying(false);
  };

  const handleContinueToAmount = () => {
    if (!accountName) return;
    setStep("amount");
  };

  const handleContinueToConfirm = () => {
    if (!amount || amountNum <= 0) return;
    setStep("confirm");
  };

  const handleSend = async () => {
    if (sending) return;
    if (!user) { setError("Please log in to send transfers"); return; }
    if (!amount || amountNum <= 0) { setError("Please enter a valid amount"); return; }
    if (!selectedBank || !accountName) { setError("Please select a beneficiary"); return; }

    setSending(true);
    setError("");

    try {
      const result = await initiateTransfer(
        user.id,
        organization?.id || null,
        total,
        accountNumber,
        selectedBank.code,
        selectedBank.name,
        accountName,
        narration,
        fee
      );

      if (result.success) {
        setSuccessRef(result.reference || "");
        setStep("success");

        if (organization?.id) {
          await saveBeneficiary(
            organization.id,
            accountName,
            accountNumber,
            selectedBank.code,
            selectedBank.name
          );
        }

        await loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "Transfer failed";
      setError(msg);
      console.error("Transfer error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleBeneficiarySelect = (b: Beneficiary) => {
    setAccountNumber(b.account_number || "");
    setSelectedBank({ code: b.bank_code || "", name: b.bank_name || "" });
    setAccountName(b.account_name || "");
    setAmount("");
    setNarration("");
    setError("");
    setVerifyError("");
    setStep("amount");
  };

  if (step === "success") {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-1">Transfer Successful!</h2>
          <p className="text-gray-500 text-sm">{formatCurrency(total)} sent to {accountName}</p>
          <p className="text-xs text-gray-400 mt-1">Fee: {formatCurrency(fee)}</p>
        </div>
        {successRef && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500 font-mono">{successRef}</span>
            <button
              onClick={() => navigator.clipboard.writeText(successRef)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
          <Button onClick={resetForm}>Send Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step === "amount" || step === "confirm" ? (
          <button
            onClick={() => setStep(step === "confirm" ? "amount" : "account")}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <div>
          <h1 className="text-xl font-bold">Send Money</h1>
          <p className="text-sm text-gray-500">
            {step === "account" ? "Enter recipient details" : step === "amount" ? "Enter amount" : "Review and confirm"}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Step 1: Account Number + Bank */}
      {step === "account" && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
              Account Number
            </label>
            <Input
              placeholder="Enter 10-digit account number"
              value={accountNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                setAccountNumber(v);
                setAccountName("");
                setSelectedBank(null);
                setVerifyError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && accountNumber.length === 10) handleAccountSubmit();
              }}
              className="h-14 text-2xl font-bold font-mono tracking-wider text-center"
              maxLength={10}
            />
          </div>

          {accountNumber.length === 10 && !selectedBank && (
            <Button
              className="w-full h-12 text-base"
              onClick={handleAccountSubmit}
            >
              Select Bank
            </Button>
          )}

          {verifying && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
              <div className="w-5 h-5 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Verifying account...</span>
            </div>
          )}

          {verifyError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {verifyError}
            </div>
          )}

          {selectedBank && !verifying && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-yellow/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-brand-yellow-dark" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{accountNumber}</p>
                    <p className="text-sm text-gray-500">{selectedBank.name}</p>
                  </div>
                  <button
                    onClick={() => setBankSheetOpen(true)}
                    className="ml-auto text-sm text-brand-yellow-dark font-medium"
                  >
                    Change
                  </button>
                </div>
                {accountName && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Account Name</p>
                    <p className="text-base font-bold text-green-600">{accountName}</p>
                  </div>
                )}
              </div>
              <Button
                className="w-full h-12 text-base"
                onClick={handleContinueToAmount}
                disabled={!accountName}
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {/* Beneficiaries */}
          {beneficiaries.length > 0 && !selectedBank && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
                Saved Beneficiaries
              </p>
              <div className="space-y-1">
                {beneficiaries.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleBeneficiarySelect(b)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.account_name}</p>
                      <p className="text-xs text-gray-400">{b.account_number} · {b.bank_name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Transfers */}
          {!selectedBank && (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Scheduled Transfers</p>
                <p className="text-xs text-gray-400">Set up recurring transfers — coming soon</p>
              </div>
            </div>
          )}

          {/* Transfer History */}
          {recentTransfers.length > 0 && !selectedBank && (
            <div className="pt-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
                Recent Transfers
              </p>
              <div className="space-y-1">
                {recentTransfers.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      t.transfer_status === "success" ? "bg-green-50" : "bg-gray-100"
                    }`}>
                      <ArrowUpRight className={`w-5 h-5 ${
                        t.transfer_status === "success" ? "text-green-500" : "text-gray-400"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.beneficiary_name || "Transfer"}</p>
                      <p className="text-xs text-gray-400">
                        {t.bank_name} · {formatDate(t.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        t.transfer_status === "success" ? "text-gray-900" : "text-gray-500"
                      }`}>
                        -{formatCurrency(t.amount)}
                      </p>
                      <p className={`text-xs ${
                        t.transfer_status === "success" ? "text-green-500" : "text-yellow-500"
                      }`}>
                        {t.transfer_status === "success" ? "Success" : t.transfer_status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Amount */}
      {step === "amount" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-yellow/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-brand-yellow-dark" />
                </div>
                <div>
                  <p className="text-sm font-medium">{accountName}</p>
                  <p className="text-xs text-gray-400">{selectedBank?.name} · {accountNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-2xl font-bold">
                ₦
              </span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-16 pl-10 text-3xl font-bold"
              />
            </div>
          </div>

          {amountNum > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Transfer Amount</span>
                <span className="font-medium">{formatCurrency(amountNum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fee (1%)</span>
                <span className="font-medium">{formatCurrency(fee)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="font-medium">Total Debit</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
              Narration (optional)
            </label>
            <Input
              placeholder="What's this for?"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="h-12"
            />
          </div>

          <Button
            className="w-full h-12 text-base"
            disabled={!amount || amountNum <= 0}
            onClick={handleContinueToConfirm}
          >
            Continue
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-yellow/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-brand-yellow-dark" />
                </div>
                <div>
                  <p className="text-sm font-medium">{accountName}</p>
                  <p className="text-xs text-gray-400">{selectedBank?.name} · {accountNumber}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Amount</span>
                  <span className="text-xl font-bold">{formatCurrency(amountNum)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Fee (1%)</span>
                  <span className="text-sm font-medium">{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                  <span className="font-medium">Total Debit</span>
                  <span className="text-lg font-bold text-brand-yellow-dark">{formatCurrency(total)}</span>
                </div>
                {narration && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Narration</span>
                    <span className="text-sm text-gray-700">{narration}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full h-12 text-base"
            disabled={sending}
            onClick={handleSend}
          >
            {sending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              `Send ${formatCurrency(total)}`
            )}
          </Button>
        </div>
      )}

      {/* Bank Select Sheet */}
      <BankSelectSheet
        open={bankSheetOpen}
        onSelect={handleBankSelect}
        onClose={() => setBankSheetOpen(false)}
        banks={banks || undefined}
      />
    </div>
  );
}
