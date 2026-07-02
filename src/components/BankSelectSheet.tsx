import { useState, useMemo, useEffect } from "react";
import { Search, X, Building2 } from "lucide-react";
import { Input } from "./ui/input";
import type { Bank } from "../data/banks";
import { searchBanks } from "../data/banks";

interface BankSelectSheetProps {
  open: boolean;
  onSelect: (bank: Bank) => void;
  onClose: () => void;
  banks?: Bank[];
}

export default function BankSelectSheet({ open, onSelect, onClose, banks }: BankSelectSheetProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    if (banks) {
      const q = query.toLowerCase();
      return banks.filter((b) => b.name.toLowerCase().includes(q) || b.code.includes(q));
    }
    return searchBanks(query);
  }, [query, banks]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">Select Bank</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search for a bank..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-base"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {query.trim() && results.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No banks found for "{query}"
            </div>
          ) : !query.trim() ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Start typing to search for a bank
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((bank) => (
                <button
                  key={`${bank.code}-${bank.name}`}
                  onClick={() => {
                    onSelect(bank);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-yellow/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-brand-yellow-dark" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{bank.name}</p>
                    <p className="text-xs text-gray-400">{bank.code}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
