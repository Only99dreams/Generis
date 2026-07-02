import { supabase, invokeFunction } from "./supabase";
import type { Receipt } from "../types";

export async function getReceipts(orgId: string): Promise<any[]> {
  const { data } = await supabase
    .from("receipts")
    .select("*, payments(amount, reference, payment_channel, paid_at, customers(full_name))")
    .eq("payments.organization_id", orgId)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getReceipt(id: string): Promise<any | null> {
  const { data } = await supabase
    .from("receipts")
    .select("*, payments(*, customers(*), invoices(*), organizations(name))")
    .eq("id", id)
    .single();

  return data;
}

export async function generateReceipt(paymentId: string) {
  return invokeFunction("generate-receipt", { paymentId });
}

export function printReceiptHtml(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.print();
}

export async function getPaymentReceipts(paymentId: string): Promise<Receipt[]> {
  const { data } = await supabase
    .from("receipts")
    .select("*")
    .eq("payment_id", paymentId);

  return data || [];
}
