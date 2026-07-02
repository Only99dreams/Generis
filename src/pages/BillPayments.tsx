import { useState } from "react";
import { Phone, Wifi, Zap, Check, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { invokeFunction } from "../services/supabase";

type BillType = "airtime" | "data" | "electricity";

const networks = ["MTN", "GLO", "AIRTEL", "9MOBILE"];

const discos = [
  { id: "phed", name: "Port Harcourt Electricity" },
  { id: "jed", name: "Jos Electricity" },
  { id: "ibedc", name: "Ibadan Electricity" },
  { id: "kedco", name: "Kano Electricity" },
  { id: "eedc", name: "Enugu Electricity" },
  { id: "abuja", name: "Abuja Electricity" },
  { id: "ikedc", name: "Ikeja Electricity" },
  { id: "bedc", name: "Benin Electricity" },
  { id: "ekedc", name: "Eko Electricity" },
];

const tabs: { type: BillType; label: string; icon: any }[] = [
  { type: "airtime", label: "Airtime", icon: Phone },
  { type: "data", label: "Data", icon: Wifi },
  { type: "electricity", label: "Electricity", icon: Zap },
];

export default function BillPayments() {
  const { user } = useAuth();
  const [billType, setBillType] = useState<BillType>("airtime");
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [amount, setAmount] = useState("");
  const [disco, setDisco] = useState("phed");
  const [meterNo, setMeterNo] = useState("");
  const [meterType, setMeterType] = useState<"PREPAID" | "POSTPAID">("PREPAID");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const reset = () => { setResult(null); setError(""); };

  const handleSubmit = async () => {
    reset();
    if (!user?.id) return;

    let body: Record<string, unknown> = { type: billType };

    if (billType === "airtime" || billType === "data") {
      if (!phone || phone.length < 11) { setError("Enter a valid 11-digit phone number"); return; }
      if (!amount || Number(amount) < 50) { setError(billType === "airtime" ? "Minimum airtime is ₦50" : "Enter a valid amount"); return; }
      body = { ...body, phoneNumber: phone, network, amount: Number(amount), senderName: user.email };
    } else {
      if (!meterNo || meterNo.length < 6) { setError("Enter a valid meter number"); return; }
      if (!amount || Number(amount) < 500) { setError("Minimum electricity is ₦500"); return; }
      body = { ...body, disco, customerId: meterNo, amount: Number(amount), meterType, payerName: user.email };
    }

    setSaving(true);
    try {
      const data = await invokeFunction("bill-payment", body);
      setResult(data?.data || data);
    } catch (err: any) {
      setError(err.message || "Payment failed. Please try again.");
    }
    setSaving(false);
  };

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent transition-all";
  const labelCls = "text-sm font-medium text-gray-700 mb-1.5 block";

  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={reset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-lg text-gray-900 mb-1">Payment Successful</h3>
          <p className="text-sm text-gray-500 mb-6">
            {billType === "airtime" && `₦${Number(amount).toLocaleString()} airtime sent to ${phone}`}
            {billType === "data" && `Data bundle purchased for ${phone}`}
            {billType === "electricity" && `Electricity token sent to ${meterNo}`}
          </p>
          {result.meta?.phcnVendToken && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-block">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Token</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-gray-900 select-all">{result.meta.phcnVendToken}</p>
            </div>
          )}
          <Button variant="outline" onClick={reset}>Pay Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bill Payments</h1>
        <p className="text-gray-500 text-sm mt-1">Pay airtime, data, and electricity bills instantly</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => { setBillType(type); reset(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              billType === type
                ? "bg-brand-yellow text-brand-black shadow-md shadow-brand-yellow/20"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-yellow/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {(billType === "airtime" || billType === "data") && (
          <>
            <div>
              <label className={labelCls}>Network</label>
              <div className="flex flex-wrap gap-2">
                {networks.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNetwork(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      network === n
                        ? "bg-brand-yellow text-brand-black"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <Input placeholder="08012345678" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} className="rounded-xl" />
            </div>
          </>
        )}

        {billType === "electricity" && (
          <>
            <div>
              <label className={labelCls}>Distribution Company</label>
              <select value={disco} onChange={(e) => setDisco(e.target.value)} className={inputCls}>
                {discos.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Meter Number</label>
              <Input placeholder="Enter meter number" value={meterNo} onChange={(e) => setMeterNo(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className={labelCls}>Meter Type</label>
              <div className="flex gap-2">
                {(["PREPAID", "POSTPAID"] as const).map((mt) => (
                  <button
                    key={mt}
                    onClick={() => setMeterType(mt)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      meterType === mt
                        ? "bg-brand-yellow text-brand-black"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {mt.charAt(0) + mt.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>Amount (₦)</label>
          <Input
            placeholder={billType === "airtime" ? "e.g. 100" : billType === "data" ? "e.g. 1000" : "e.g. 2000"}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            type="text"
            className="rounded-xl"
          />
        </div>

        <Button className="w-full" size="lg" loading={saving} onClick={handleSubmit}>
          {saving ? "Processing..." : `Pay ₦${Number(amount || 0).toLocaleString()}`}
        </Button>
      </div>
    </div>
  );
}
