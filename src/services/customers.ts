import { supabase } from "./supabase";
import type { Customer } from "../types";

export async function createCustomer(
  organizationId: string,
  fullName: string,
  email?: string,
  phone?: string
) {
  const code = `CUST-${Date.now()}`;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      organization_id: organizationId,
      full_name: fullName,
      email,
      phone,
      customer_code: code,
    })
    .select()
    .single();

  if (error) throw error;

  const user = (await supabase.auth.getUser()).data.user;

  if (user) {
    await supabase.from("customer_activity").insert({
      customer_id: data.id,
      activity: "Customer Created",
      metadata: { created_by: user.id },
    });
  }

  return data;
}

export async function getCustomers(orgId: string): Promise<Customer[]> {
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getCustomersPaginated(orgId: string, page = 0, pageSize = 20): Promise<{ data: Customer[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data: data || [], count: count || 0 };
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateCustomers(
  customers: Array<{ full_name: string; email?: string; phone?: string }>,
  orgId: string
) {
  const timestamp = Date.now();
  const rows = customers.map((c, i) => ({
    organization_id: orgId,
    full_name: c.full_name,
    email: c.email || null,
    phone: c.phone || null,
    customer_code: `CUST-${timestamp}-${i}`,
    status: "active" as const,
  }));

  const { data, error } = await supabase.from("customers").insert(rows).select();

  if (error) throw error;
  return data as Customer[];
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}
