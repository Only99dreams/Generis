import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Wallet, User, Mail, Lock, Building2, Eye, EyeOff, Phone } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { supabase } from "../services/supabase";
import { createVirtualAccount } from "../services/virtualAccount";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [orgName, setOrgName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    setError("");

    if (!email || !password || !fullName) {
      setError("Full name, email, and password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // No session means email confirmation is required
    if (!data.session) {
      setLoading(false);
      navigate("/login", { state: { email, message: "Check your email to confirm your account before signing in." } });
      return;
    }

    const user = data.user;
    if (user) {
      await supabase
        .from("profiles")
        .update({ phone: phone || null })
        .eq("id", user.id);

      let orgId: string | undefined;

      if (orgName) {
        const slug = orgName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
        const { data: org } = await supabase
          .from("organizations")
          .insert({ name: orgName, slug, owner_id: user.id, organization_type: "fintech" })
          .select()
          .single();

        if (org) {
          orgId = org.id;
          await supabase.from("organization_users").insert({
            organization_id: org.id, user_id: user.id, role: "owner",
          });
        }
      }

      try {
        await createVirtualAccount(user.id, fullName, orgId, undefined, orgName || undefined);
      } catch (err) {
        console.error("Virtual account creation failed:", err);
      }
    }

    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-brand-black flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-yellow to-yellow-600 flex items-center justify-center mb-6 shadow-lg shadow-brand-yellow/20">
          <Wallet className="w-8 h-8 text-brand-black" />
        </div>
        <h1 className="text-white text-2xl font-bold mb-1">Create Account</h1>
        <p className="text-gray-400 text-sm mb-8">Join Generis Wallet</p>

        <Card className="w-full max-w-sm bg-brand-dark border-gray-800">
          <CardContent className="p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 bg-brand-black border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-brand-black border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Phone (optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              />
              <button
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Organization (optional)"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="pl-10 bg-brand-black border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              loading={loading}
              onClick={handleRegister}
            >
              Create Account
            </Button>
          </CardContent>
        </Card>

        <p className="text-gray-500 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-yellow hover:text-brand-yellow-dark font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
