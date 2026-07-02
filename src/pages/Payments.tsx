import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getPaymentsPaginated } from "../services/payments";
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

  const loadPayments = async (p = 0) => {
    if (!organization?.id) return;
    const { data, count } = await getPaymentsPaginated(organization.id, p, PAGE_SIZE);
    setPayments(data);
    setTotal(count);
  };

  useEffect(() => {
    loadPayments(0);
    setPage(0);
  }, [organization?.id]);

  useRealtimePayments(organization?.id || "", () => {
    loadPayments(page);
  });

  const handlePageChange = (p: number) => {
    setPage(p);
    loadPayments(p);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

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
