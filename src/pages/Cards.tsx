import { useEffect, useState } from "react";
import {
  CreditCard, Plus, Trash2, Eye, EyeOff, Check, Calendar,
  Lock, Wallet, X, Sparkles, Copy, Globe, Link,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { formatDate } from "../lib/utils";
import { getSavedCards, generateCard, getCardDetails, removeSavedCard, setDefaultCard, tokenizeCard } from "../services/cards";
import { getWallet } from "../services/wallet";
import type { SavedCard } from "../types";

interface CardDetails {
  pan: string;
  cvv: string;
  exp_month: string;
  exp_year: string;
  card_brand: string;
  last4: string;
}

const brandGradients: Record<string, string> = {
  visa: "from-blue-600 via-blue-700 to-blue-900",
  mastercard: "from-orange-500 via-red-500 to-yellow-600",
  master_card: "from-orange-500 via-red-500 to-yellow-600",
  verve: "from-green-600 via-emerald-600 to-teal-700",
};

const brandColors: Record<string, string> = {
  visa: "bg-blue-600",
  mastercard: "bg-orange-500",
  master_card: "bg-orange-500",
  verve: "bg-emerald-600",
};

const brandLogos: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  master_card: "MC",
  verve: "VERVE",
};

function formatPAN(pan: string): string {
  return pan.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export default function Cards() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [visibleDetails, setVisibleDetails] = useState<Record<string, CardDetails | null>>({});
  const [fetchingDetails, setFetchingDetails] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [showLinkCard, setShowLinkCard] = useState(false);
  const [linkForm, setLinkForm] = useState({ cardNumber: "", expMonth: "", expYear: "", cvv: "", cardName: "" });
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

  const loadCards = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getSavedCards(user.id);
      setCards(data);
    } catch (err) {
      console.error("Failed to load cards", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadCards(); }, [user?.id]);

  const handleGenerate = async () => {
    if (!user?.id) return;
    setGenerating(true);
    try {
      const wallet = await getWallet();
      await generateCard({ userId: user.id, walletId: wallet?.id });
      await loadCards();
    } catch (err) {
      console.error("Failed to generate card", err);
    }
    setGenerating(false);
  };

  const handleRemoveCard = async (id: string) => {
    try {
      await removeSavedCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      setVisibleDetails((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (err) {
      console.error("Failed to remove card", err);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user?.id) return;
    try {
      await setDefaultCard(id, user.id);
      setCards((prev) =>
        prev.map((c) => ({ ...c, is_default: c.id === id }))
      );
    } catch (err) {
      console.error("Failed to set default card", err);
    }
  };

  const toggleCardVisibility = async (cardId: string) => {
    if (visibleDetails[cardId]) {
      setVisibleDetails((prev) => ({ ...prev, [cardId]: null }));
      return;
    }
    if (fetchingDetails.has(cardId)) return;

    setFetchingDetails((prev) => new Set(prev).add(cardId));
    try {
      const res = await getCardDetails(cardId);
      if (res?.data) {
        setVisibleDetails((prev) => ({ ...prev, [cardId]: res.data }));
      }
    } catch (err) {
      console.error("Failed to fetch card details", err);
    }
    setFetchingDetails((prev) => { const n = new Set(prev); n.delete(cardId); return n; });
  };

  const handleLinkCard = async () => {
    if (!user?.id) return;
    setLinking(true);
    setLinkError("");
    try {
      await tokenizeCard({
        userId: user.id,
        ...linkForm,
      });
      setShowLinkCard(false);
      setLinkForm({ cardNumber: "", expMonth: "", expYear: "", cvv: "", cardName: "" });
      await loadCards();
    } catch (err: any) {
      setLinkError(err.message || "Failed to link card");
    }
    setLinking(false);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Card Holder";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("cards.title")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("cards.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLinkCard(true)}>
            <Link className="w-4 h-4 mr-1.5" />
            Link Card
          </Button>
          <Button onClick={handleGenerate} loading={generating}>
            <Sparkles className="w-4 h-4 mr-1.5" />
            {t("cards.addCard")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-yellow/20 to-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-10 h-10 text-brand-yellow" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{t("cards.noCards")}</h3>
            <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">{t("cards.noCardsDesc")}</p>
            <Button size="lg" onClick={handleGenerate} loading={generating} className="shadow-lg shadow-brand-yellow/20">
              <Sparkles className="w-5 h-5 mr-2" />
              {t("cards.addFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {cards.map((card, idx) => {
            const details = visibleDetails[card.id];
            const isVisible = !!details;
            const gradient = brandGradients[card.card_brand] || "from-gray-700 via-gray-800 to-gray-900";
            return (
              <div
                key={card.id}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-xl animate-slide-scale`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/4 -translate-x-1/4" />
                <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/[0.02] rounded-full blur-xl" />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wider font-medium">
                        {card.card_type} · {card.card_brand}
                      </p>
                      <p className="text-lg font-bold tracking-widest mt-0.5">
                        {brandLogos[card.card_brand] || card.card_brand.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {card.is_default && (
                        <Badge className="bg-white/20 text-white border-0 text-[10px] backdrop-blur-sm">
                          {t("cards.default")}
                        </Badge>
                      )}
                      <button
                        onClick={() => toggleCardVisibility(card.id)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        title={isVisible ? t("cards.hideDetails") : t("cards.showDetails")}
                      >
                        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleRemoveCard(card.id)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-colors"
                        title={t("cards.removeCard")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-xs text-white/40 uppercase tracking-widest">{t("cards.cardNumber")}</span>
                    </div>
                    {isVisible && details ? (
                      <div className="flex items-center gap-2">
                        <p className="text-lg md:text-xl font-mono tracking-[0.15em]">
                          {formatPAN(details.pan)}
                        </p>
                        <button
                          onClick={() => copyToClipboard(details.pan, "pan")}
                          className="p-1 rounded-md hover:bg-white/10 transition-colors"
                        >
                          {copied === "pan" ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-white/50" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="text-lg md:text-xl font-mono tracking-[0.15em]">
                        **** **** **** {card.last4}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">{t("cards.expires")}</p>
                      <p className="text-sm font-mono font-semibold">
                        {isVisible && details ? details.exp_month : card.exp_month}/
                        {isVisible && details ? details.exp_year : card.exp_year}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">{t("cards.holder")}</p>
                      <p className="text-sm font-semibold truncate max-w-[160px]">{userName}</p>
                    </div>
                    {isVisible && details && (
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">{t("addCard.cvv")}</p>
                        <p className="text-sm font-mono font-semibold">{details.cvv}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    {!card.is_default && (
                      <button
                        onClick={() => handleSetDefault(card.id)}
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        {t("cards.setDefault")}
                      </button>
                    )}
                    {isVisible && details && (
                      <button
                        onClick={() => copyToClipboard(`${details.pan} ${details.exp_month}/${details.exp_year} ${details.cvv}`, "all")}
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        {t("common.copy")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLinkCard && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Link External Card</h3>
              <button onClick={() => { setShowLinkCard(false); setLinkError(""); }} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {linkError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{linkError}</div>
            )}
            <Input placeholder="Card Number" value={linkForm.cardNumber} onChange={(e) => setLinkForm({ ...linkForm, cardNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })} className="font-mono" />
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="MM" value={linkForm.expMonth} onChange={(e) => setLinkForm({ ...linkForm, expMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })} className="font-mono" />
              <Input placeholder="YY" value={linkForm.expYear} onChange={(e) => setLinkForm({ ...linkForm, expYear: e.target.value.replace(/\D/g, "").slice(0, 2) })} className="font-mono" />
              <Input placeholder="CVV" value={linkForm.cvv} onChange={(e) => setLinkForm({ ...linkForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} className="font-mono" />
            </div>
            <Input placeholder="Cardholder Name (optional)" value={linkForm.cardName} onChange={(e) => setLinkForm({ ...linkForm, cardName: e.target.value })} />
            <Button className="w-full" loading={linking} disabled={!linkForm.cardNumber || !linkForm.expMonth || !linkForm.expYear || !linkForm.cvv} onClick={handleLinkCard}>
              <Link className="w-4 h-4 mr-1.5" />
              Link Card
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-brand-yellow" />
            {t("cards.benefits")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t("cards.secureStorage")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("cards.secureStorageDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t("cards.fastCheckout")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t("cards.fastCheckoutDesc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Online Payments</p>
                <p className="text-xs text-gray-500 mt-0.5">Use your virtual card details for online purchases anywhere cards are accepted.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
