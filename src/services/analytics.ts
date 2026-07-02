import { invokeFunction } from "./supabase";
import type { Analytics } from "../types";

export async function getAnalytics(
  organizationId: string
): Promise<Analytics | null> {
  if (!organizationId) return null;

  return invokeFunction("analytics", { organizationId });
}
