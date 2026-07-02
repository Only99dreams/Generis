import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile, Organization } from "../types";
import { getOrganizations } from "../services/organizations";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  signOut: () => Promise<void>;
  setOrganization: (org: Organization | null) => void;
  refreshProfile: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  organization: null,
  organizations: [],
  loading: true,
  signOut: async () => {},
  setOrganization: () => {},
  refreshProfile: async () => {},
  refreshOrganizations: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganizationState] = useState<Organization | null>(
    () => {
      const saved = localStorage.getItem("selectedOrg");
      return saved ? JSON.parse(saved) : null;
    }
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshProfile = async () => {
    const u = (await supabase.auth.getUser()).data.user;
    if (!u) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.id)
      .single();

    setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      setUser(u);
      if (u) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .single();
        setProfile(p);

        const orgs = await getOrganizations();
        setOrganizations(orgs);

        const saved = localStorage.getItem("selectedOrg");
        if (saved) {
          setOrganizationState(JSON.parse(saved));
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(p);

        const orgs = await getOrganizations();
        setOrganizations(orgs);
      } else {
        setProfile(null);
        setOrganizations([]);
        setOrganizationState(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("selectedOrg");
    setOrganizationState(null);
    navigate("/");
  };

  const setOrganization = (org: Organization | null) => {
    setOrganizationState(org);
    if (org) {
      localStorage.setItem("selectedOrg", JSON.stringify(org));
    } else {
      localStorage.removeItem("selectedOrg");
    }
  };

  const refreshOrganizations = async () => {
    const orgs = await getOrganizations();
    setOrganizations(orgs);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organization,
        organizations,
        loading,
        signOut,
        setOrganization,
        refreshProfile,
        refreshOrganizations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
