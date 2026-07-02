import { useEffect, useRef } from "react";

interface QrCodeProps {
  value: string;
  size?: number;
}

export default function QrCode({ value, size = 200 }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;
    import("qrcode").then((QRCode) => {
      if (!mounted || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    });
    return () => { mounted = false; };
  }, [value, size]);

  return <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 12 }} />;
}
