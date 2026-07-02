import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Wallet, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { supabase } from "../services/supabase";

export default function Login() {
  const location = useLocation();
  const initialEmail = (location.state as any)?.email || "";
  const confirmMessage = (location.state as any)?.message || "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-yellow flex items-center justify-center mb-6 shadow-lg shadow-brand-yellow/20">
          <Wallet className="w-8 h-8 text-brand-black" />
        </div>
        <h1 className="text-white text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-gray-400 text-sm mb-8">Sign in to your Generis account</p>

        <Card className="w-full max-w-sm bg-brand-dark border-gray-800">
          <CardContent className="p-6 space-y-4">
            {confirmMessage && (
              <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-lg p-3 text-brand-yellow-dark text-sm">
                {confirmMessage}
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-brand-black border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-brand-black border-gray-700 text-white placeholder:text-gray-500"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              className="w-full"
              size="lg"
              loading={loading}
              onClick={handleLogin}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>

        <p className="text-gray-500 text-sm mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-yellow hover:text-brand-yellow-dark font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
