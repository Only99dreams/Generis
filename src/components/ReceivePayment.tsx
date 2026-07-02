import { useState, useMemo } from "react";
import { Copy } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import QrCodeComponent from "./QrCode";

interface ReceivePaymentProps {
  accountNumber: string;
  accountName: string;
  bankName: string;
  virtualAccountId: string;
  recipientName: string;
}

export default function ReceivePayment({
  accountNumber,
  accountName,
  bankName,
  virtualAccountId,
  recipientName,
}: ReceivePaymentProps) {
  const [amount, setAmount] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  const baseUrl = window.location.origin;

  const paymentUrl = useMemo(() => {
    const url = `${baseUrl}/pay/${virtualAccountId}`;
    const amt = parseFloat(amount);
    if (amt > 0) return `${url}?amount=${amt}`;
    return url;
  }, [baseUrl, virtualAccountId, amount]);

  const copyToClipboard = async (text: string, type: "link" | "number") => {
    await navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* QR Code */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 shrink-0">
            <QrCodeComponent value={paymentUrl} size={180} />
          </div>

          {/* Details */}
          <div className="flex-1 w-full min-w-0 space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">Receive Payment</h3>
              <p className="text-gray-500 text-sm mb-1">
                {recipientName} — share your payment link or account details to receive money.
              </p>
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                Amount (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  ₦
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg font-semibold"
                />
              </div>
            </div>

            {/* Payment link */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">
                Payment Link
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 truncate font-mono">
                  {paymentUrl}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className=""
                  onClick={() => copyToClipboard(paymentUrl, "link")}
                >
                  <Copy className="w-4 h-4" />
                  {copiedLink ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            {/* Account details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Account</p>
                <p className="text-base sm:text-lg font-bold font-mono tracking-wider break-all">{accountNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Bank</p>
                <p className="font-medium">{bankName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Name</p>
                <p className="font-medium truncate">{accountName}</p>
              </div>
            </div>

            {/* Copy account number */}
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => copyToClipboard(accountNumber, "number")}
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">{copiedNumber ? "Copied!" : "Copy Number"}</span>
              <span className="hidden sm:inline">{copiedNumber ? "Copied!" : "Copy Account Number"}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
