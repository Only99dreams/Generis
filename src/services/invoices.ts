import { supabase } from "./supabase";
import type { Invoice } from "../types";

export async function createInvoice(
  organizationId: string,
  customerId: string,
  amount: number,
  description?: string,
  dueDate?: string
) {
  const invNumber = `INV-${Date.now()}`;

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      amount,
      description,
      due_date: dueDate,
      invoice_number: invNumber,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("customer_activity").insert({
    customer_id: customerId,
    activity: "Invoice Created",
    metadata: { amount, invoice_number: invNumber },
  });

  return data;
}

export async function getInvoices(orgId: string): Promise<Invoice[]> {
  const { data } = await supabase
    .from("invoices")
    .select("*, customers(full_name, email)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getInvoicesPaginated(orgId: string, page = 0, pageSize = 20, search?: string, status?: string): Promise<{ data: Invoice[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("invoices")
    .select("*, customers(full_name, email)", { count: "exact" })
    .eq("organization_id", orgId);

  if (search) {
    query = query.ilike("invoice_number", `%${search}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data: data || [], count: count || 0 };
}

export async function getCustomerInvoices(customerId: string): Promise<Invoice[]> {
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data } = await supabase
    .from("invoices")
    .select("*, customers(full_name, email, phone)")
    .eq("id", id)
    .maybeSingle();

  return data;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>) {
  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
