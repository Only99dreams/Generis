import { supabase, invokeFunction } from "./supabase";
import type { Subscription, SubscriptionLog } from "../types";

export async function createSubscription(params: {
  savedCardId: string;
  name: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  description?: string;
  billingDay?: number;
  organizationId?: string;
}): Promise<{ data: Subscription | null; error: string | null }> {
  try {
    const { data, error } = await invokeFunction("create-subscription", params);
    if (error) return { data: null, error };
    return { data: data.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function cancelSubscription(id: string, action: "cancelled" | "paused" | "active"): Promise<string | null> {
  try {
    const { error } = await invokeFunction("cancel-subscription", { id, action });
    return error || null;
  } catch (err: any) {
    return err.message;
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*, saved_cards(card_brand, last4)")
    .order("created_at", { ascending: false });

  return (data || []) as Subscription[];
}

export async function getSubscriptionLogs(id: string): Promise<SubscriptionLog[]> {
  const { data } = await supabase
    .from("subscription_logs")
    .select("*")
    .eq("subscription_id", id)
    .order("charged_at", { ascending: false });

  return (data || []) as SubscriptionLog[];
}
