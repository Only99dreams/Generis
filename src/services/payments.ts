import { supabase } from "./supabase";
import type { Payment } from "../types";

export async function getPayments(orgId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from("payments")
    .select("*, customers(full_name), invoices(invoice_number)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getPaymentsPaginated(orgId: string, page = 0, pageSize = 20): Promise<{ data: Payment[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("payments")
    .select("*, customers(full_name), invoices(invoice_number)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data: data || [], count: count || 0 };
}

export async function getCustomerPayments(customerId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return data || [];
}
