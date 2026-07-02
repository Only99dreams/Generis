import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function invokeFunction(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try {
      if (typeof (error as any).context?.json === "function") {
        const ctx = await (error as any).context.json();
        msg = ctx?.error || ctx?.message || msg;
      }
    } catch {}
    throw new Error(msg);
  }
  return data;
}