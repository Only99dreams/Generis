import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getReceipts, printReceiptHtml, generateReceipt } from "../services/receipts";
import { useMobile } from "../hooks/useMobile";

export default function Receipts() {
  const { organization } = useAuth();
  const isMobile = useMobile();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  const load = async () => {
    if (!organization?.id) return;
    const data = await getReceipts(organization.id);
    setReceipts(data);
  };

  useEffect(() => { load(); }, [organization?.id]);

  const handlePrint = async (paymentId: string) => {
    setGenerating(paymentId);
    try {
      const result = await generateReceipt(paymentId);
      printReceiptHtml(result.html);
    } catch (err) {
      console.error(err);
    }
    setGenerating(null);
  };

  return (
    <div>
      <h1 style={{ margin: "0 0 24px", fontSize: isMobile ? 20 : 24 }}>Receipts</h1>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
              <th style={thStyle}>Receipt #</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>
                  <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                    {r.receipt_number}
                  </span>
                </td>
                <td style={tdStyle}>
                  {r.payments?.customers?.full_name || "N/A"}
                </td>
                <td style={tdStyle}>
                  ₦{Number(r.payments?.amount || 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handlePrint(r.payments?.id)}
                    disabled={generating === r.payments?.id}
                    style={{
                      padding: "6px 14px", borderRadius: 6, border: "1px solid #ddd",
                      background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                      opacity: generating === r.payments?.id ? 0.6 : 1,
                    }}
                  >
                    {generating === r.payments?.id ? "..." : "Print"}
                  </button>
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 40, opacity: 0.5 }}>
                  No receipts yet. Receipts are generated automatically when payments are received.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 13, fontWeight: 600,
  color: "#6b7280", textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px", fontSize: 14,
};
