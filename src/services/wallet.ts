import { supabase } from "./supabase";
import type { Wallet, Transaction } from "../types";

export async function getWallet(organizationId?: string): Promise<Wallet | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  let query = supabase.from("wallets").select("*").eq("user_id", user.id);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    query = query.is("organization_id", null);
  }

  const { data } = await query.maybeSingle();

  return data;
}

export async function getTransactions(limit = 20, organizationId?: string): Promise<Transaction[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  let query = supabase
    .from("transactions")
    .select("*");

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getTransactionsPaginated(page = 0, pageSize = 20, organizationId?: string, search?: string, type?: string): Promise<{ data: Transaction[]; count: number }> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { data: [], count: 0 };

  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    query = query.eq("user_id", user.id);
  }

  if (search) {
    query = query.ilike("narration", `%${search}%`);
  }

  if (type) {
    query = query.eq("transaction_type", type);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data: data || [], count: count || 0 };
}

export async function getLedgerEntries(): Promise<any[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}
