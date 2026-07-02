import { supabase } from "./supabase";
import type { Organization, OrganizationUser } from "../types";

export async function createOrganization(name: string, type?: string) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const slug = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();

  const { data, error } = await supabase
    .from("organizations")
    .insert({ name, slug, owner_id: user.id, organization_type: type })
    .select()
    .single();

  if (error) throw error;

  const { error: memberError } = await supabase.from("organization_users").insert({
    organization_id: data.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) throw memberError;

  return data;
}

export async function getOrganizations(): Promise<Organization[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data: owned } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", user.id);

  const { data: memberships } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("user_id", user.id);

  const memberOrgIds = memberships?.map((m) => m.organization_id) || [];

  if (memberOrgIds.length === 0) {
    return owned || [];
  }

  const { data: memberOrgs } = await supabase
    .from("organizations")
    .select("*")
    .in("id", memberOrgIds);

  const all = [...(owned || []), ...(memberOrgs || [])];
  const seen = new Set<string>();
  return all.filter((org) => {
    if (seen.has(org.id)) return false;
    seen.add(org.id);
    return true;
  });
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export async function getOrganizationMembers(orgId: string): Promise<OrganizationUser[]> {
  const { data } = await supabase
    .from("organization_users")
    .select("*")
    .eq("organization_id", orgId);

  return data || [];
}

export async function addOrganizationMember(
  orgId: string,
  userId: string,
  role: string = "viewer"
) {
  const { data, error } = await supabase
    .from("organization_users")
    .insert({ organization_id: orgId, user_id: userId, role })
    .select()
    .single();

  if (error) throw error;
  return data;
}
