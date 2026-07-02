import { supabase, invokeFunction } from "./supabase";
import type { VirtualAccount } from "../types";

export async function createVirtualAccount(
  userId: string,
  fullName: string,
  organizationId?: string,
  customerId?: string,
  orgName?: string
) {
  return invokeFunction("create-virtual-account", {
    userId,
    fullName,
    organizationId,
    customerId,
    orgName,
  });
}

export async function getVirtualAccount(organizationId?: string): Promise<VirtualAccount | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  let query = supabase.from("virtual_accounts").select("*");

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    query = query.is("organization_id", null).eq("user_id", user.id);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getCustomerVirtualAccount(
  customerId: string
): Promise<VirtualAccount | null> {
  const { data } = await supabase
    .from("virtual_accounts")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  return data;
}
