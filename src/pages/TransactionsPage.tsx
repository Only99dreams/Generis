import { useEffect, useState } from "react";
import { getTransactionsPaginated } from "../services/wallet";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/input";
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
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    loadData(0, search, typeFilter);
    setPage(0);
  }, [organization?.id]);

  const loadData = async (p: number, s = search, t = typeFilter) => {
    const { data, count } = await getTransactionsPaginated(p, PAGE_SIZE, organization?.id, s || undefined, t || undefined);
    setTransactions(data);
    setTotal(count);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    loadData(p, search, typeFilter);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
    loadData(0, val, typeFilter);
  };

  const handleTypeFilter = (val: string) => {
    setTypeFilter(val);
    setPage(0);
    loadData(0, search, val);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Statement</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => handleTypeFilter(e.target.value)}
          className="w-full sm:w-44 h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/50"
        >
          <option value="">All Types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
          <option value="transfer">Transfer</option>
          <option value="fee">Fee</option>
          <option value="payment">Payment</option>
        </select>
      </div>

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
