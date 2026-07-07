import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Wallet, Copy, ArrowLeft, CreditCard } from "lucide-react";
import { supabase, invokeFunction } from "../services/supabase";
import QrCodeComponent from "../components/QrCode";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import type { VirtualAccount, PaymentLink } from "../types";

type VaWithOwner = VirtualAccount & {
  owner_name?: string;
};

interface PaymentLinkData extends PaymentLink {
  owner_name?: string;
}

export default function PaymentPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const amountParam = searchParams.get("amount");
  const statusParam = searchParams.get("status");

  const [va, setVa] = useState<VaWithOwner | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showCardForm, setShowCardForm] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const isPaymentLink = id?.startsWith("PL-");

  useEffect(() => {
    if (statusParam === "success") {
      setSuccessMessage("Payment successful! Your transaction has been processed.");
    }
  }, [statusParam]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    if (isPaymentLink && id) {
      loadPaymentLink(id);
    } else if (id) {
      loadVirtualAccount(id);
    }
  }, [id]);

  const loadPaymentLink = async (ref: string) => {
    try {
      const { data, error } = await invokeFunction("get-payment-link", { ref });
      if (error || !data?.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const link = data.data as PaymentLinkData;

      if (link.status !== "active") {
        setExpired(true);
        setLoading(false);
        return;
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setPaymentLink(link);

      if (link.virtual_accounts) {
        setVa({
          id: link.virtual_account_id || "",
          customer_id: null,
          user_id: link.user_id,
          organization_id: link.organization_id,
          account_ref: null,
          account_number: link.virtual_accounts.account_number,
          account_name: link.virtual_accounts.account_name,
          bank_name: link.virtual_accounts.bank_name,
          bank_code: null,
          provider: "nomba",
          status: "active",
          created_at: link.created_at,
          owner_name: link.owner_name,
        });
      }

      setLoading(false);
    } catch {
      setNotFound(true);
      setLoading(false);
    }
  };

  const loadVirtualAccount = async (vaId: string) => {
    const { data, error } = await supabase
      .from("virtual_accounts")
      .select("*")
      .eq("id", vaId)
      .maybeSingle();

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
  };

  const paymentUrl = paymentLink?.reference
    ? `${window.location.origin}/pay/${paymentLink.reference}`
    : va
      ? `${window.location.origin}/pay/${va.id}${amountParam ? `?amount=${amountParam}` : ""}`
      : "";

  const copyNumber = async () => {
    if (!va?.account_number) return;
    await navigator.clipboard.writeText(va.account_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayAmount = paymentLink?.amount || (amountParam ? parseFloat(amountParam) : null);
  const description = paymentLink?.description || null;

  const handleCardPayment = async () => {
    if (!customerEmail || !paymentLink) return;
    setCardLoading(true);
    setCardError("");

    const callbackUrl = `${window.location.origin}/pay/${paymentLink.reference}?status=success`;

    const { data, error } = await invokeFunction("pay-with-card", {
      paymentLinkReference: paymentLink.reference,
      customerEmail,
      callbackUrl,
    });

    setCardLoading(false);

    if (error || !data?.data?.checkoutLink) {
      setCardError(error || "Failed to initiate payment");
      return;
    }

    window.location.href = data.data.checkoutLink;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="w-8 h-8 rounded-lg bg-brand-yellow flex items-center justify-center">
          <Wallet className="w-4 h-4 text-brand-black" />
        </div>
        <span className="font-bold text-gray-900">Generis</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        {loading ? (
          <div className="w-12 h-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
          </div>
        ) : successMessage ? (
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-gray-500 text-sm mb-6">{successMessage}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-brand-yellow-dark hover:text-brand-yellow font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Generis
            </Link>
          </div>
        ) : expired ? (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Link expired</h2>
            <p className="text-gray-500 text-sm mb-6">
              This payment link has expired or is no longer active.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-brand-yellow-dark hover:text-brand-yellow font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Generis
            </Link>
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
            {description && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-medium mb-1">Description</p>
                <p className="font-medium">{description}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              {displayAmount ? (
                <>
                  <p className="text-gray-500 text-sm mb-1">Requesting</p>
                  <p className="text-4xl font-bold tracking-tight">
                    {`\u20A6${displayAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">from {paymentLink?.owner_name || va.owner_name}</p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-sm mb-1">Receive payment from</p>
                  <p className="text-2xl font-bold">{va.owner_name}</p>
                </>
              )}
            </div>

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

            {paymentLink && !showCardForm && (
              <Button
                onClick={() => setShowCardForm(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pay with Card
              </Button>
            )}

            {paymentLink && showCardForm && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h3 className="font-semibold text-sm">Pay with Card</h3>
                <p className="text-xs text-gray-400">
                  You will be redirected to our secure checkout page to complete your payment.
                </p>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

                {cardError && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{cardError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowCardForm(false); setCardError(""); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCardPayment}
                    disabled={cardLoading || !customerEmail}
                    className="flex-1"
                  >
                    {cardLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Continue to Payment"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Or pay via Bank Transfer
              </p>
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
