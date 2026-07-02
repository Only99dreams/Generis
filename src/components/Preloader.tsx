import { useEffect, useState } from "react";
import { Wallet, ArrowRight } from "lucide-react";

export default function Preloader({ onFinish }: { onFinish: () => void }) {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShow(false);
            setTimeout(onFinish, 300);
          }, 300);
          return 100;
        }
        return p + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onFinish]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-brand-black transition-opacity duration-500 ${progress >= 100 ? "opacity-0" : "opacity-100"}`}
    >
      <div className="animate-slide-up flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-brand-yellow flex items-center justify-center mb-6 shadow-lg shadow-brand-yellow/20">
          <Wallet className="w-10 h-10 text-brand-black" />
        </div>
        <h1 className="text-white text-3xl font-bold tracking-tight">Generis</h1>
        <p className="text-gray-400 text-sm mt-2">Dedicated Virtual Accounts</p>

        <div className="w-48 h-1 bg-gray-800 rounded-full mt-10 overflow-hidden">
          <div
            className="h-full bg-brand-yellow rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-gray-500 text-xs mt-3">
          {progress < 100 ? "Initializing..." : "Ready"}
        </p>
      </div>
    </div>
  );
}
