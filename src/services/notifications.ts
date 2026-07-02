import { supabase } from "./supabase";
import type { Notification } from "../types";

export async function getNotifications(): Promise<Notification[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}

export async function markNotificationRead(id: string) {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
}

export async function markAllNotificationsRead() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
}

export async function getUnreadCount(): Promise<number> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count || 0;
}
