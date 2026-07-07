import { supabase, invokeFunction } from "./supabase";
import type { ScheduledTransfer, ScheduledTransferLog } from "../types";

export async function createScheduledTransfer(params: {
  beneficiaryName: string;
  beneficiaryAccount: string;
  bankCode: string;
  bankName: string;
  amount: number;
  narration?: string;
  frequency: "daily" | "weekly" | "monthly" | "once";
  intervalDay?: number;
  intervalWeekday?: number;
  startDate?: string;
  endDate?: string;
  organizationId?: string;
}): Promise<{ data: ScheduledTransfer | null; error: string | null }> {
  try {
    const { data, error } = await invokeFunction("create-scheduled-transfer", params);
    if (error) return { data: null, error };
    return { data: data.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function cancelScheduledTransfer(id: string, action: "cancelled" | "paused" | "active"): Promise<string | null> {
  try {
    const { error } = await invokeFunction("cancel-scheduled-transfer", { id, action });
    return error || null;
  } catch (err: any) {
    return err.message;
  }
}

export async function getScheduledTransfers(): Promise<ScheduledTransfer[]> {
  const { data } = await supabase
    .from("scheduled_transfers")
    .select("*")
    .order("created_at", { ascending: false });

  return (data || []) as ScheduledTransfer[];
}

export async function getScheduledTransferLogs(id: string): Promise<ScheduledTransferLog[]> {
  const { data } = await supabase
    .from("scheduled_transfer_logs")
    .select("*")
    .eq("scheduled_transfer_id", id)
    .order("executed_at", { ascending: false });

  return (data || []) as ScheduledTransferLog[];
}
