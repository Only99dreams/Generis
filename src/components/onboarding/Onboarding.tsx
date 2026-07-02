import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";

const slides = [
  {
    icon: Wallet,
    title: "Your Digital Wallet",
    description: "Get your own virtual account number instantly. Send, receive and manage money seamlessly.",
  },
  {
    icon: Building2,
    title: "Smart Collections",
    description: "Collect payments from customers automatically with dedicated virtual accounts.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description: "Enterprise-grade security powered by Nomba. Every transaction is verified end-to-end.",
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const slide = slides[step];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-brand-black flex flex-col relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-[-25%] left-[-15%] w-[28rem] h-[28rem] rounded-full bg-brand-yellow/10 blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[30rem] h-[30rem] rounded-full bg-yellow-500/5 blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute top-[45%] right-[-10%] w-56 h-56 rounded-full bg-brand-yellow/5 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Header */}
      <div className="relative pt-8 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-yellow flex items-center justify-center shadow-lg shadow-brand-yellow/20">
            <Wallet className="w-5 h-5 text-brand-black" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Generis</span>
        </div>
        {step < slides.length - 1 && (
          <button
            onClick={() => navigate("/login")}
            className="text-gray-500 hover:text-white text-sm font-medium transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slides */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        <div
          key={step}
          className="animate-slide-scale flex flex-col items-center text-center max-w-sm"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-yellow to-yellow-600 flex items-center justify-center mb-8 shadow-2xl shadow-brand-yellow/25 ring-1 ring-white/10">
            <Icon className="w-12 h-12 text-brand-black" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-3 tracking-tight">
            {slide.title}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {slide.description}
          </p>
        </div>

        {/* Slide indicators */}
        <div className="flex items-center gap-2 mt-12">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-500 ${
                i === step
                  ? "w-8 h-2.5 bg-brand-yellow shadow-sm shadow-brand-yellow/30"
                  : "w-2.5 h-2.5 bg-gray-700 hover:bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="relative p-6 pb-10 flex flex-col gap-3">
        {step < slides.length - 1 ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => setStep(step + 1)}
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate("/register")}
          >
            Create Account
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}

        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            onClick={() => navigate("/login")}
            className="text-gray-500 hover:text-white transition-colors font-medium"
          >
            Sign In
          </button>
          <span className="text-gray-700">|</span>
          <button
            onClick={() => navigate("/register")}
            className="text-gray-500 hover:text-white transition-colors font-medium"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
