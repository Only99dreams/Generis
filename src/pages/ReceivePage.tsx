import { useEffect, useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getVirtualAccount, createVirtualAccount } from "../services/virtualAccount";
import { useAuth } from "../context/AuthContext";
import ReceivePayment from "../components/ReceivePayment";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { VirtualAccount } from "../types";

export default function ReceivePage() {
  const { organization, user, profile } = useAuth();
  const navigate = useNavigate();
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const va = await getVirtualAccount(organization?.id);
    setVirtualAccount(va);
    setLoading(false);
  };

  useEffect(() => { load(); }, [organization?.id]);

  const handleCreate = async () => {
    if (!user?.id) return;
    setCreating(true);
    try {
      const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
      await createVirtualAccount(user.id, userName, organization?.id, undefined, organization?.name);
      await load();
    } catch (err) { console.error(err); }
    setCreating(false);
  };

  const recipientName = organization?.name || profile?.full_name || user?.user_metadata?.full_name || "User";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Receive Payment</h1>
          <p className="text-sm text-gray-500 truncate">
            {recipientName}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : virtualAccount ? (
        <ReceivePayment
          accountNumber={virtualAccount.account_number || ""}
          accountName={virtualAccount.account_name || ""}
          bankName={virtualAccount.bank_name || ""}
          virtualAccountId={virtualAccount.id}
          recipientName={recipientName}
        />
      ) : (
        <Card className="">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-yellow/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-brand-yellow" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Get Your Virtual Account</h3>
            <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">
              Generate a dedicated account number to receive payments from anyone, anytime.
            </p>
            <Button size="lg" loading={creating} onClick={handleCreate}>
              Generate Virtual Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
