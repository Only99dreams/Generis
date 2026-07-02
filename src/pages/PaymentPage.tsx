import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Wallet, Copy, ArrowLeft } from "lucide-react";
import { supabase } from "../services/supabase";
import QrCodeComponent from "../components/QrCode";
import type { VirtualAccount } from "../types";

type VaWithOwner = VirtualAccount & {
  owner_name?: string;
};

export default function PaymentPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const amount = searchParams.get("amount");

  const [va, setVa] = useState<VaWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    supabase
      .from("virtual_accounts")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        let ownerName = data.account_name || "Generis User";

        if (data.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.user_id)
            .maybeSingle();
          if (profile?.full_name) ownerName = profile.full_name;
        }

        if (data.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", data.organization_id)
            .maybeSingle();
          if (org?.name) ownerName = org.name;
        }

        setVa({ ...data, owner_name: ownerName });
        setLoading(false);
      });
  }, [id]);

  const paymentUrl = va
    ? `${window.location.origin}/pay/${va.id}${amount ? `?amount=${amount}` : ""}`
    : "";

  const copyNumber = async () => {
    if (!va?.account_number) return;
    await navigator.clipboard.writeText(va.account_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayAmount = amount ? parseFloat(amount) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="w-8 h-8 rounded-lg bg-brand-yellow flex items-center justify-center">
          <Wallet className="w-4 h-4 text-brand-black" />
        </div>
        <span className="font-bold text-gray-900">Generis</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        {loading ? (
          <div className="w-12 h-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notFound || !va ? (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Payment not found</h2>
            <p className="text-gray-500 text-sm mb-6">
              This payment link is invalid or has expired.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-brand-yellow-dark hover:text-brand-yellow font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Generis
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-6">
            {/* Amount card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              {displayAmount ? (
                <>
                  <p className="text-gray-500 text-sm mb-1">Requesting</p>
                  <p className="text-4xl font-bold tracking-tight">
                    ₦{displayAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-sm mb-1">Receive payment from</p>
                  <p className="text-2xl font-bold">{va.owner_name}</p>
                </>
              )}
            </div>

            {/* QR code */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <QrCodeComponent value={paymentUrl} size={180} />
                </div>
              </div>
              <p className="text-center text-sm text-gray-500">
                Scan to view payment details
              </p>
            </div>

            {/* Account details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
                    Account Number
                  </p>
                  <p className="text-xl font-bold font-mono tracking-wider">
                    {va.account_number}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
                    Bank
                  </p>
                  <p className="text-lg font-medium">{va.bank_name}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
                  Account Name
                </p>
                <p className="font-medium">{va.account_name}</p>
              </div>

              <button
                onClick={copyNumber}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy Account Number"}
              </button>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400">
              Powered by{" "}
              <Link to="/" className="text-brand-yellow-dark font-medium hover:text-brand-yellow">
                Generis Wallet
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
