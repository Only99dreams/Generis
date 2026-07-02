import { supabase, invokeFunction } from "./supabase";
import type { Transfer, Beneficiary } from "../types";

export async function initiateTransfer(
  userId: string,
  organizationId: string | null,
  amount: number,
  accountNumber: string,
  bankCode: string,
  bankName: string,
  beneficiaryName: string,
  narration?: string,
  fee?: number
) {
  return invokeFunction("bank-transfer", {
    userId,
    organizationId,
    amount,
    accountNumber,
    bankCode,
    bankName,
    beneficiaryName,
    narration,
    fee,
  });
}

export async function verifyBankAccount(accountNumber: string, bankCode: string, bankName?: string) {
  const user = (await supabase.auth.getUser()).data.user;
  const savedOrg = localStorage.getItem("selectedOrg");
  const organizationId = savedOrg ? JSON.parse(savedOrg).id : null;

  return invokeFunction("verify-bank-account", {
    accountNumber,
    bankCode,
    bankName,
    userId: user?.id,
    organizationId,
  });
}

export async function getTransfers(orgId: string | null): Promise<Transfer[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  let query = supabase
    .from("transfers")
    .select("*")
    .order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data } = await query;
  return data || [];
}

export async function getBeneficiaries(): Promise<Beneficiary[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function saveBeneficiary(
  orgId: string,
  accountName: string,
  accountNumber: string,
  bankCode: string,
  bankName: string
) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("beneficiaries")
    .insert({
      organization_id: orgId,
      user_id: user.id,
      account_name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      bank_name: bankName,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
