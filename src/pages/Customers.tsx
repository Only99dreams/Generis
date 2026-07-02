import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Check, X, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getCustomersPaginated, createCustomer, updateCustomer, deleteCustomer, bulkCreateCustomers } from "../services/customers";
import { getCustomerVirtualAccount, createVirtualAccount } from "../services/virtualAccount";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import Pagination from "../components/Pagination";
import type { Customer, VirtualAccount } from "../types";

const PAGE_SIZE = 20;

interface CustomerWithAccount extends Customer {
  virtual_account?: VirtualAccount | null;
}

interface CsvRow {
  full_name: string;
  email?: string;
  phone?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return [];
  const rows: CsvRow[] = [];
  const startIndex = lines[0].toLowerCase().includes("name") ? 1 : 0;
  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    if (parts.length >= 1 && parts[0]) {
      rows.push({
        full_name: parts[0],
        email: parts[1] || undefined,
        phone: parts[2] || undefined,
      });
    }
  }
  return rows;
}

export default function Customers() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customers, setCustomers] = useState<CustomerWithAccount[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState<CustomerWithAccount | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showBulk, setShowBulk] = useState(false);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number } | null>(null);

  const loadCustomers = async (p = page) => {
    if (!organization?.id) return;
    setLoading(true);
    const { data, count } = await getCustomersPaginated(organization.id, p, PAGE_SIZE);
    setTotal(count);
    const withAccounts: CustomerWithAccount[] = [];
    for (const c of data) {
      const va = await getCustomerVirtualAccount(c.id);
      withAccounts.push({ ...c, virtual_account: va });
    }
    setCustomers(withAccounts);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers(0);
    setPage(0);
  }, [organization?.id]);

  const handlePageChange = (p: number) => {
    setPage(p);
    loadCustomers(p);
  };

  const handleCreate = async () => {
    if (!organization?.id || !name) return;
    setCreating(true);
    try {
      const customer = await createCustomer(organization.id, name, email, phone);
      await createVirtualAccount("", name, organization.id, customer.id, organization.name);
      setName("");
      setEmail("");
      setPhone("");
      setShowForm(false);
      await loadCustomers(0);
      setPage(0);
    } catch (err) {
      console.error(err);
    }
    setCreating(false);
  };

  const handleEdit = (c: CustomerWithAccount) => {
    setEditingCustomer(c);
    setEditName(c.full_name);
    setEditEmail(c.email || "");
    setEditPhone(c.phone || "");
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer || !editName) return;
    try {
      await updateCustomer(editingCustomer.id, {
        full_name: editName,
        email: editEmail || null,
        phone: editPhone || null,
      });
      setEditingCustomer(null);
      await loadCustomers(page);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      setDeletingId(null);
      await loadCustomers(0);
      setPage(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setParsedRows(rows);
      setUploadResults(null);
    };
    reader.readAsText(file);
  };

  const handleBulkUpload = async () => {
    if (!organization?.id || parsedRows.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadTotal(parsedRows.length);
    setUploadResults(null);

    let success = 0;
    let failed = 0;

    try {
      const created = await bulkCreateCustomers(parsedRows, organization.id);
      for (let i = 0; i < created.length; i++) {
        try {
          await createVirtualAccount("", created[i].full_name, organization.id, created[i].id, organization.name);
          success++;
        } catch {
          failed++;
        }
        setUploadProgress(i + 1);
      }
    } catch (err) {
      console.error("Bulk create failed:", err);
      failed = parsedRows.length - success;
    }

    setUploadResults({ success, failed });
    setParsedRows([]);
    await loadCustomers(0);
    setPage(0);
    setUploading(false);
  };

  const clearBulk = () => {
    setParsedRows([]);
    setUploadResults(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowBulk(!showBulk); setShowForm(false); }}>
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => { setShowForm(!showForm); setShowBulk(false); }}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="animate-slide-up">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">New Customer</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <Input placeholder="Full Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button loading={creating} disabled={!name} onClick={handleCreate}>
              Create Customer & Generate Account
            </Button>
          </CardContent>
        </Card>
      )}

      {showBulk && (
        <Card className="animate-slide-up">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Bulk Upload Customers</h3>
              <button onClick={() => { setShowBulk(false); clearBulk(); }} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {parsedRows.length === 0 && !uploadResults ? (
              <>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-brand-yellow/50 transition-colors">
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-700">Click to select CSV file</p>
                  <p className="text-sm text-gray-400 mt-1">Name, Email, Phone columns</p>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">CSV Format</p>
                  <code className="text-xs text-gray-500 block leading-relaxed">
                    name,email,phone{'\n'}
                    John Doe,john@example.com,+2348012345678{'\n'}
                    Jane Smith,jane@example.com,+2348098765432
                  </code>
                </div>
              </>
            ) : uploading ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Creating customers...</span>
                  <span className="font-medium">{uploadProgress}/{uploadTotal}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-brand-yellow rounded-full transition-all duration-300" style={{ width: `${(uploadProgress / uploadTotal) * 100}%` }} />
                </div>
              </div>
            ) : uploadResults ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                  <Check className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Upload complete</p>
                    <p className="text-sm text-green-600">
                      {uploadResults.success} succeeded{uploadResults.failed > 0 && `, ${uploadResults.failed} failed`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={clearBulk}>Upload Another File</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{parsedRows.length} customer{parsedRows.length !== 1 ? "s" : ""} found</p>
                  <button onClick={clearBulk} className="text-sm text-gray-400 hover:text-gray-600">Clear</button>
                </div>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-600">Name</th>
                        <th className="text-left p-3 font-medium text-gray-600">Email</th>
                        <th className="text-left p-3 font-medium text-gray-600">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">{row.full_name}</td>
                          <td className="p-3 text-gray-500">{row.email || "—"}</td>
                          <td className="p-3 text-gray-500">{row.phone || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                    <FileText className="w-4 h-4" /> Change File
                  </Button>
                  <Button className="flex-1" onClick={handleBulkUpload}>
                    <Upload className="w-4 h-4" /> Upload {parsedRows.length} Customer{parsedRows.length !== 1 ? "s" : ""}
                  </Button>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Phone</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Account Number</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No customers yet. Add your first customer.
                    </td>
                  </tr>
                ) : customers.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium">{c.full_name}</div>
                      {c.customer_code && <div className="text-xs text-gray-400">{c.customer_code}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{c.email || "—"}</td>
                    <td className="px-4 py-3.5 text-gray-500">{c.phone || "—"}</td>
                    <td className="px-4 py-3.5">
                      {c.virtual_account?.account_number ? (
                        <span className="font-mono font-semibold tracking-wide">{c.virtual_account.account_number}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={c.status === "active" ? "success" : "warning"}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}>
                          View
                        </Button>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeletingId(c.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={handlePageChange} />
        </CardContent>
      </Card>

      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingCustomer(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Edit Customer</h3>
            <div className="space-y-3">
              <Input placeholder="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Input placeholder="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              <Input placeholder="Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setEditingCustomer(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeletingId(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Customer</h3>
            <p className="text-gray-500 text-sm mb-6">Are you sure you want to delete this customer? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(deletingId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
