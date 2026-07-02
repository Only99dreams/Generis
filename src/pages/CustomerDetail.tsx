import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCustomer } from "../services/customers";
import { getCustomerVirtualAccount } from "../services/virtualAccount";
import { getCustomerInvoices } from "../services/invoices";
import { getCustomerPayments } from "../services/payments";
import { createInvoice } from "../services/invoices";
import { useAuth } from "../context/AuthContext";
import type { Customer, VirtualAccount, Invoice, Payment } from "../types";

export default function CustomerDetail() {
  const { id } = useParams();
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invAmount, setInvAmount] = useState("");
  const [invDesc, setInvDesc] = useState("");
  const [invDue, setInvDue] = useState("");

  useEffect(() => {
    if (!id) return;
    getCustomer(id).then(setCustomer);
    getCustomerVirtualAccount(id).then(setVirtualAccount);
    getCustomerInvoices(id).then(setInvoices);
    getCustomerPayments(id).then(setPayments);
  }, [id]);

  const handleCreateInvoice = async () => {
    if (!organization?.id || !id || !invAmount) return;
    try {
      await createInvoice(
        organization.id,
        id,
        Number(invAmount),
        invDesc || undefined,
        invDue || undefined
      );
      setInvAmount("");
      setInvDesc("");
      setInvDue("");
      setShowInvoiceForm(false);
      const updated = await getCustomerInvoices(id);
      setInvoices(updated);
    } catch (err) {
      console.error(err);
    }
  };

  if (!customer) {
    return <div style={{ opacity: 0.5 }}>Loading...</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate("/customers")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          color: "#e94560",
          marginBottom: 16,
          padding: 0,
        }}
      >
        &larr; Back to Customers
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>{customer.full_name}</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.5, fontSize: 14 }}>
            {customer.customer_code} &middot; {customer.email || "No email"}
          </p>
        </div>
        <span
          style={{
            padding: "4px 14px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background:
              customer.status === "active"
                ? "rgba(74,222,128,0.15)"
                : "rgba(233,69,96,0.15)",
            color: customer.status === "active" ? "#16a34a" : "#e94560",
          }}
        >
          {customer.status}
        </span>
      </div>

      {virtualAccount && (
        <div
          style={{
            background: "#1a1a2e",
            color: "#fff",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>
            Dedicated Account Number
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 3,
              fontFamily: "monospace",
            }}
          >
            {virtualAccount.account_number}
          </div>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
            {virtualAccount.bank_name} &middot; {virtualAccount.account_name}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            flex: 1,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 4 }}>Phone</div>
          <div style={{ fontSize: 16 }}>{customer.phone || "Not set"}</div>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            flex: 1,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 4 }}>Risk Score</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {customer.risk_score || "N/A"}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>Invoices</h3>
        <button
          onClick={() => setShowInvoiceForm(!showInvoiceForm)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#e94560",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {showInvoiceForm ? "Cancel" : "Create Invoice"}
        </button>
      </div>

      {showInvoiceForm && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <input
            type="number"
            placeholder="Amount"
            value={invAmount}
            onChange={(e) => setInvAmount(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Description"
            value={invDesc}
            onChange={(e) => setInvDesc(e.target.value)}
            style={inputStyle}
          />
          <input
            type="date"
            value={invDue}
            onChange={(e) => setInvDue(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={handleCreateInvoice}
            disabled={!invAmount}
            style={{ ...buttonStyle, opacity: !invAmount ? 0.6 : 1 }}
          >
            Create Invoice
          </button>
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
              <th style={thStyle}>Invoice #</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Paid</th>
              <th style={thStyle}>Due Date</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{inv.invoice_number || "-"}</td>
                <td style={tdStyle}>
                  ₦{Number(inv.amount).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  ₦{Number(inv.amount_paid).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  {inv.due_date
                    ? new Date(inv.due_date).toLocaleDateString()
                    : "-"}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background:
                        inv.status === "paid"
                          ? "rgba(74,222,128,0.15)"
                          : inv.status === "partial"
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(156,163,175,0.15)",
                      color:
                        inv.status === "paid"
                          ? "#16a34a"
                          : inv.status === "partial"
                          ? "#d97706"
                          : "#6b7280",
                    }}
                  >
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>
                  No invoices yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Payments</h3>
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
              <th style={thStyle}>Reference</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Channel</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{p.reference || "-"}</td>
                <td style={tdStyle}>
                  ₦{Number(p.amount).toLocaleString()}
                </td>
                <td style={tdStyle}>{p.payment_channel || "-"}</td>
                <td style={tdStyle}>
                  {p.paid_at
                    ? new Date(p.paid_at).toLocaleDateString()
                    : "-"}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background:
                        p.payment_status === "success"
                          ? "rgba(74,222,128,0.15)"
                          : "rgba(233,69,96,0.15)",
                      color:
                        p.payment_status === "success"
                          ? "#16a34a"
                          : "#e94560",
                    }}
                  >
                    {p.payment_status}
                  </span>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>
                  No payments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: "#e94560",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: 14,
};
