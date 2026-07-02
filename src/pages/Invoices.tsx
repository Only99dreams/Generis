import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getInvoicesPaginated } from "../services/invoices";
import { getCustomers } from "../services/customers";
import { createInvoice } from "../services/invoices";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import Pagination from "../components/Pagination";
import type { Customer } from "../types";

const PAGE_SIZE = 20;

export default function Invoices() {
  const { organization } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async (p = 0) => {
    if (!organization?.id) return;
    const [invData, custData] = await Promise.all([
      getInvoicesPaginated(organization.id, p, PAGE_SIZE),
      getCustomers(organization.id),
    ]);
    setInvoices(invData.data);
    setTotal(invData.count);
    setCustomers(custData as Customer[]);
  };

  useEffect(() => {
    loadData(0);
    setPage(0);
  }, [organization?.id]);

  const handlePageChange = (p: number) => {
    setPage(p);
    loadData(p);
  };

  const handleCreate = async () => {
    if (!organization?.id || !customerId || !amount) return;
    setLoading(true);
    try {
      await createInvoice(organization.id, customerId, Number(amount), description || undefined, dueDate || undefined);
      setCustomerId("");
      setAmount("");
      setDescription("");
      setDueDate("");
      setShowForm(false);
      await loadData(0);
      setPage(0);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create Invoice"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">New Invoice</h3>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/50"
            >
              <option value="">Select Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
            <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <Button loading={loading} disabled={!customerId || !amount} onClick={handleCreate}>
              Create Invoice
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Invoice #</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Paid</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Due Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-medium">{inv.invoice_number || "-"}</td>
                    <td className="px-4 py-3.5 text-gray-500">{inv.customers?.full_name || "N/A"}</td>
                    <td className="px-4 py-3.5 font-medium">₦{Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-gray-500">₦{Number(inv.amount_paid).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        inv.status === "paid" ? "bg-green-50 text-green-600" :
                        inv.status === "partial" ? "bg-yellow-50 text-yellow-600" :
                        "bg-gray-50 text-gray-500"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">No invoices yet</td>
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
