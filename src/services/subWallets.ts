import { supabase, invokeFunction } from "./supabase";
import type { SubWallet, SavingsPlan } from "../types";

export async function createSubWallet(params: {
  name: string;
  targetAmount?: number;
  color?: string;
  icon?: string;
  goalDate?: string;
  organizationId?: string;
}): Promise<{ data: SubWallet | null; error: string | null }> {
  try {
    const { data, error } = await invokeFunction("create-sub-wallet", params);
    if (error) return { data: null, error };
    return { data: data.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function getSubWallets(organizationId?: string): Promise<SubWallet[]> {
  let query = supabase.from("sub_wallets").select("*").order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data } = await query;
  return (data || []) as SubWallet[];
}

export async function transferToSubWallet(subWalletId: string, amount: number, note?: string): Promise<{ data: any; error: string | null }> {
  try {
    const { data, error } = await invokeFunction("transfer-to-sub-wallet", { subWalletId, amount, note });
    if (error) return { data: null, error };
    return { data: data.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function withdrawFromSubWallet(subWalletId: string, amount: number, note?: string): Promise<{ data: any; error: string | null }> {
  try {
    const { data, error } = await invokeFunction("withdraw-from-sub-wallet", { subWalletId, amount, note });
    if (error) return { data: null, error };
    return { data: data.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function completeSubWallet(id: string): Promise<string | null> {
  const { error } = await supabase.from("sub_wallets").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", id);
  return error?.message || null;
}

export async function deleteSubWallet(id: string): Promise<string | null> {
  const { error } = await supabase.from("sub_wallets").delete().eq("id", id);
  return error?.message || null;
}

export async function createSavingsPlan(params: {
  subWalletId: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly";
}): Promise<{ data: SavingsPlan | null; error: string | null }> {
  try {
    const { data, error } = await invokeFunction("create-savings-plan", params);
    if (error) return { data: null, error };
    return { data: data.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function cancelSavingsPlan(id: string, action: "cancelled" | "paused" | "active"): Promise<string | null> {
  try {
    const { error } = await invokeFunction("cancel-savings-plan", { id, action });
    return error || null;
  } catch (err: any) {
    return err.message;
  }
}

export async function getSavingsPlans(subWalletId?: string): Promise<SavingsPlan[]> {
  let query = supabase.from("savings_plans").select("*, sub_wallets(name, current_balance)").order("created_at", { ascending: false });
  if (subWalletId) query = query.eq("sub_wallet_id", subWalletId);
  const { data } = await query;
  return (data || []) as SavingsPlan[];
}
