import { supabase, invokeFunction } from "./supabase";
import type { SavedCard } from "../types";

export async function getSavedCards(userId: string): Promise<SavedCard[]> {
  const { data, error } = await supabase
    .from("saved_cards")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function generateCard(params: {
  userId: string;
  walletId?: string;
}) {
  return invokeFunction("generate-card", params as Record<string, unknown>);
}

export async function getCardDetails(cardId: string) {
  return invokeFunction("get-card-details", { cardId });
}

export async function removeSavedCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_cards")
    .delete()
    .eq("id", cardId);

  if (error) throw error;
}

export async function setDefaultCard(cardId: string, userId: string): Promise<void> {
  await supabase
    .from("saved_cards")
    .update({ is_default: false })
    .eq("user_id", userId);

  const { error } = await supabase
    .from("saved_cards")
    .update({ is_default: true })
    .eq("id", cardId);

  if (error) throw error;
}

export async function tokenizeCard(params: {
  userId: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  cardName?: string;
}) {
  return invokeFunction("tokenize-card", params as Record<string, unknown>);
}
