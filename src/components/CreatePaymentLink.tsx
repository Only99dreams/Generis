import { useState } from "react";
import { X, Link as LinkIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { createPaymentLink } from "../services/paymentLinks";

interface CreatePaymentLinkProps {
  open: boolean;
  onClose: () => void;
  onCreated: (url: string) => void;
}

export default function CreatePaymentLink({ open, onClose, onCreated }: CreatePaymentLinkProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleCreate = async () => {
    setLoading(true);
    setError("");

    const { data, error: err } = await createPaymentLink({
      amount: amount ? parseFloat(amount) : undefined,
      description: description || undefined,
    });

    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    if (data?.url) {
      onCreated(data.url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-yellow/10 flex items-center justify-center">
              <LinkIcon className="w-4 h-4 text-brand-yellow-dark" />
            </div>
            <h2 className="text-lg font-bold">Create Payment Link</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
              Amount (optional)
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
            <p className="text-xs text-gray-400 mt-1">Leave empty to let the payer set any amount</p>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
              Description (optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Website design payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Create Payment Link"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
