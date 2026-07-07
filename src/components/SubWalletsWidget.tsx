import { useEffect, useState } from "react";
import { PiggyBank, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { formatCurrency } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { getSubWallets } from "../services/subWallets";
import type { SubWallet } from "../types";

export default function SubWalletsWidget() {
  const { organization } = useAuth();
  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubWallets(organization?.id).then((data) => {
      setSubWallets(data);
      setLoading(false);
    });
  }, []);

  const progress = (bal: number, target: number | null) =>
    target ? Math.min((bal / target) * 100, 100) : bal > 0 ? 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <PiggyBank className="w-4 h-4" />
          Savings Goals
        </h3>
        <Button size="sm" variant="ghost" onClick={() => window.location.href = "/sub-wallets"}>
          <Plus className="w-3.5 h-3.5" />
          Manage
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subWallets.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No savings goals yet.</p>
      ) : (
        <div className="space-y-3">
          {subWallets.slice(0, 4).map((sw) => {
            const pct = progress(sw.current_balance, sw.target_amount);
            return (
              <div key={sw.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sw.color }} />
                    <span className="text-sm font-medium truncate">{sw.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0 font-medium">
                    {formatCurrency(sw.current_balance)}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: sw.color }}
                  />
                </div>
                {sw.target_amount && (
                  <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                    {pct.toFixed(0)}% of {formatCurrency(sw.target_amount)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
