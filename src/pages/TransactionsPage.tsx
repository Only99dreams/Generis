import { useEffect, useState } from "react";
import { getTransactionsPaginated } from "../services/wallet";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "../components/ui/card";
import Pagination from "../components/Pagination";
import { formatCurrency, formatDate } from "../lib/utils";
import type { Transaction } from "../types";

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const { organization } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData(0);
    setPage(0);
  }, [organization?.id]);

  const loadData = async (p: number) => {
    const { data, count } = await getTransactionsPaginated(p, PAGE_SIZE, organization?.id);
    setTransactions(data);
    setTotal(count);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    loadData(p);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Statement</h1>

      <Card>
        <CardContent className="p-0 divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No transactions yet</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  tx.transaction_type === "deposit" || tx.transaction_type === "credit"
                    ? "bg-green-50"
                    : tx.transaction_type === "fee"
                    ? "bg-gray-100"
                    : "bg-red-50"
                }`}>
                  <span className={`text-lg ${
                    tx.transaction_type === "deposit" || tx.transaction_type === "credit"
                      ? "text-green-500" : tx.transaction_type === "fee"
                      ? "text-gray-500" : "text-red-500"
                  }`}>
                    {tx.transaction_type === "deposit" || tx.transaction_type === "credit" ? "↓" : "↑"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {tx.narration || tx.transaction_type}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(tx.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${
                    tx.transaction_type === "deposit" || tx.transaction_type === "credit"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}>
                    {tx.transaction_type === "deposit" || tx.transaction_type === "credit" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    tx.status === "success" ? "text-green-500" :
                    tx.status === "pending" ? "text-yellow-500" :
                    "text-red-500"
                  }`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={handlePageChange} />
        </CardContent>
      </Card>
    </div>
  );
}
