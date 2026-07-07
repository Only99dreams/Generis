import { supabase, invokeFunction } from "./supabase";
import type { PaymentLink } from "../types";

export async function createPaymentLink(params: {
  amount?: number;
  description?: string;
}): Promise<{ data: PaymentLink | null; error: string | null }> {
  try {
    const { data, error } = await invokeFunction("create-payment-link", params);
    if (error) return { data: null, error };
    return { data: data.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function getPaymentLinks(): Promise<PaymentLink[]> {
  const { data: userLinks } = await supabase
    .from("payment_links")
    .select("*, virtual_accounts!inner(account_number, bank_name, account_name)")
    .order("created_at", { ascending: false });

  return (userLinks || []) as PaymentLink[];
}

export async function getPaymentLink(ref: string): Promise<PaymentLink | null> {
  const { data } = await supabase
    .from("payment_links")
    .select("*, virtual_accounts!inner(account_number, bank_name, account_name)")
    .eq("reference", ref)
    .maybeSingle();

  return data as PaymentLink | null;
}

export async function payWithCard(params: {
  paymentLinkReference: string;
  customerEmail: string;
  callbackUrl: string;
}): Promise<{ data: { checkoutLink: string; orderReference: string } | null; error: string | null }> {
  try {
    const { data, error } = await invokeFunction("pay-with-card", params);
    if (error) return { data: null, error };
    return { data: data.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
