import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { createOrganization } from "../services/organizations";
import { supabase } from "../services/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Building2, User, Phone, Check, ArrowRight, Globe, Wallet } from "lucide-react";
import { languages, type LanguageCode } from "../data/translations";

export default function Settings() {
  const { profile, user, organization, organizations, setOrganization, refreshProfile, refreshOrganizations } =
    useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("fintech");
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreateOrg = async () => {
    if (!orgName) return;
    setCreating(true);
    try {
      const org = await createOrganization(orgName, orgType);
      setOrganization(org);
      await refreshOrganizations();
      setOrgName("");
      setMessage("Organization created!");
    } catch (err: any) {
      setMessage(err.message);
    }
    setCreating(false);
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .upsert({ id: profile?.id || user?.id, full_name: fullName, phone });
      await refreshProfile();
      setMessage(t("settings.saved"));
    } catch (err: any) {
      setMessage(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      {message && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-600 text-sm flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" />
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t("settings.fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t("settings.phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={handleUpdateProfile}
            loading={saving}
          >
            {t("settings.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-yellow" />
            {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as LanguageCode)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                  language === lang.code
                    ? "border-brand-yellow bg-brand-yellow/5 ring-1 ring-brand-yellow/30"
                    : "border-gray-100 hover:border-gray-200 bg-white hover:shadow-sm"
                }`}
              >
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-yellow/20 to-amber-500/10 flex items-center justify-center text-sm font-bold text-gray-700">
                  {lang.nativeName[0]}
                </span>
                <span className="text-xs font-medium text-gray-900">{lang.nativeName}</span>
                <span className="text-[10px] text-gray-400">{lang.name}</span>
                {language === lang.code && (
                  <Check className="w-3 h-3 text-brand-yellow" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Building2 className="w-4 h-4 inline mr-2 text-brand-yellow" />
            Organization
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {organization?.name || "No organization selected"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Create New Organization</h4>
            <div className="space-y-3">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Organization Name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
              >
                <option value="fintech">Fintech</option>
                <option value="school">School</option>
                <option value="hospital">Hospital</option>
                <option value="cooperative">Cooperative</option>
                <option value="other">Other</option>
              </select>
              <Button
                onClick={handleCreateOrg}
                disabled={!orgName}
                loading={creating}
              >
                <Building2 className="w-4 h-4" />
                Create Organization
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {organizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Switch Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setOrganization(null)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors text-left ${
                !organization
                  ? "border-brand-yellow/30 bg-brand-yellow/5"
                  : "border-gray-100 hover:border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Personal Account</p>
                  <p className="text-sm text-gray-500">Individual wallet</p>
                </div>
              </div>
              {!organization ? (
                <span className="bg-brand-yellow/10 text-brand-yellow-dark text-xs font-semibold px-3 py-1 rounded-full">
                  Active
                </span>
              ) : (
                <ArrowRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => setOrganization(org)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors text-left ${
                  organization?.id === org.id
                    ? "border-brand-yellow/30 bg-brand-yellow/5"
                    : "border-gray-100 hover:border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{org.organization_type}</p>
                  </div>
                </div>
                {organization?.id === org.id ? (
                  <span className="bg-brand-yellow/10 text-brand-yellow-dark text-xs font-semibold px-3 py-1 rounded-full">
                    Active
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
