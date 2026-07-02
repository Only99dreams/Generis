import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getPaymentsPaginated } from "../services/payments";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import Pagination from "../components/Pagination";
import { useRealtimePayments } from "../services/realtime";
import { formatCurrency } from "../lib/utils";

const PAGE_SIZE = 20;

export default function Payments() {
  const { organization } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const loadPayments = async (p = 0, s = search, st = statusFilter, ch = channelFilter) => {
    if (!organization?.id) return;
    const { data, count } = await getPaymentsPaginated(organization.id, p, PAGE_SIZE, s || undefined, st || undefined, ch || undefined);
    setPayments(data);
    setTotal(count);
  };

  useEffect(() => {
    loadPayments(0, search, statusFilter, channelFilter);
    setPage(0);
  }, [organization?.id]);

  useRealtimePayments(organization?.id || "", () => {
    loadPayments(page, search, statusFilter, channelFilter);
  });

  const handlePageChange = (p: number) => {
    setPage(p);
    loadPayments(p, search, statusFilter, channelFilter);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
    loadPayments(0, val, statusFilter, channelFilter);
  };

  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    setPage(0);
    loadPayments(0, search, val, channelFilter);
  };

  const handleChannelFilter = (val: string) => {
    setChannelFilter(val);
    setPage(0);
    loadPayments(0, search, statusFilter, val);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <Input
            placeholder="Search reference..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="w-full sm:w-40 h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/50"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={channelFilter}
          onChange={(e) => handleChannelFilter(e.target.value)}
          className="w-full sm:w-40 h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/50"
        >
          <option value="">All Channels</option>
          <option value="virtual_account">Virtual Account</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="ussd">USSD</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Reference</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Invoice</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Channel</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm">{p.reference || "-"}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{p.customers?.full_name || "N/A"}</td>
                    <td className="px-4 py-3.5 text-gray-500">{p.invoices?.invoice_number || "-"}</td>
                    <td className="px-4 py-3.5 font-semibold">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3.5 text-gray-500">{p.payment_channel || "-"}</td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        p.payment_status === "success" ? "bg-green-50 text-green-600" :
                        p.payment_status === "pending" ? "bg-yellow-50 text-yellow-600" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {p.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">No payments received yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={handlePageChange} />
        </CardContent>
      </Card>
    </div>
  );
}
