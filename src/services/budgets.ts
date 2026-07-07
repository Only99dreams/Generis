import { supabase, invokeFunction } from "./supabase";
import type { Budget } from "../types";

export async function createBudget(params: {
  name: string;
  category: string;
  amount: number;
  period?: "weekly" | "monthly" | "yearly";
  color?: string;
  organizationId?: string;
}): Promise<{ data: Budget | null; error: string | null }> {
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      organization_id: params.organizationId || null,
      name: params.name,
      category: params.category,
      amount: params.amount,
      period: params.period || "monthly",
      color: params.color || "#EAB308",
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Budget, error: null };
}

export async function getBudgets(organizationId?: string): Promise<Budget[]> {
  const { data } = await supabase
    .from("budgets")
    .select("*")
    .order("created_at", { ascending: false });

  return (data || []) as Budget[];
}

export async function refreshBudgetSpending(organizationId?: string): Promise<Budget[]> {
  try {
    const { data } = await invokeFunction("get-budgets", { organizationId });
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function deleteBudget(id: string): Promise<string | null> {
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  return error?.message || null;
}
