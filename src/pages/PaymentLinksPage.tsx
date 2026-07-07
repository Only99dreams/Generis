import { useEffect, useState } from "react";
import { Link as LinkIcon, Copy, ExternalLink, Plus, Check } from "lucide-react";
import { getPaymentLinks } from "../services/paymentLinks";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import CreatePaymentLink from "../components/CreatePaymentLink";
import { formatDateTime } from "../lib/utils";
import type { PaymentLink } from "../types";

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  useEffect(() => {
    getPaymentLinks().then((data) => {
      setLinks(data);
      setLoading(false);
    });
  }, []);

  const copyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCreated = (url: string) => {
    setNewLinkUrl(url);
    setShowCreate(false);
    getPaymentLinks().then(setLinks);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700";
      case "completed": return "bg-blue-100 text-blue-700";
      case "expired": return "bg-gray-100 text-gray-500";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Links</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage shareable payment links</p>
        </div>
        <Button onClick={() => { setNewLinkUrl(null); setShowCreate(true); }}>
          <Plus className="w-4 h-4" />
          New Link
        </Button>
      </div>

      {newLinkUrl && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-emerald-800">Payment link created!</p>
                <p className="text-xs text-emerald-600 font-mono truncate max-w-[300px]">{newLinkUrl}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyLink(newLinkUrl, "new")}>
                <Copy className="w-3.5 h-3.5" />
                {copiedIndex === "new" ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(newLinkUrl, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <LinkIcon className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No payment links yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create a payment link to start receiving money</p>
            <Button onClick={() => { setNewLinkUrl(null); setShowCreate(true); }}>
              <Plus className="w-4 h-4" />
              Create First Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {links.map((link) => {
            const url = `${window.location.origin}/pay/${link.reference}`;
            return (
              <Card key={link.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">
                          {link.amount
                            ? `₦${link.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                            : "Any amount"}
                        </p>
                        <Badge className={statusColor(link.status)}>
                          {link.status}
                        </Badge>
                      </div>
                      {link.description && (
                        <p className="text-sm text-gray-500 truncate">{link.description}</p>
                      )}
                      <p className="text-xs text-gray-400 font-mono mt-1 truncate">{url}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created {formatDateTime(link.created_at)} · Used {link.times_used} time{link.times_used !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyLink(url, link.id)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedIndex === link.id ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(url, "_blank")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreatePaymentLink
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
