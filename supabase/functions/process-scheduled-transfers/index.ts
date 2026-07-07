import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function computeNextRun(schedule: any): string {
  const now = new Date();
  const next = new Date(schedule.next_run);

  switch (schedule.frequency) {
    case "once":
      return "";

    case "daily": {
      next.setDate(next.getDate() + 1);
      return next.toISOString();
    }

    case "weekly": {
      next.setDate(next.getDate() + 7);
      return next.toISOString();
    }

    case "monthly": {
      next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    }

    default:
      return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    const { data: schedules, error: fetchError } = await supabase
      .from("scheduled_transfers")
      .select("*")
      .eq("status", "active")
      .lte("next_run", now)
      .order("next_run", { ascending: true });

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    for (const schedule of schedules) {
      if (schedule.end_date && new Date(schedule.end_date) < new Date()) {
        await supabase
          .from("scheduled_transfers")
          .update({ status: "completed", updated_at: now })
          .eq("id", schedule.id);
        continue;
      }

      if (schedule.frequency === "once" && schedule.last_run) {
        await supabase
          .from("scheduled_transfers")
          .update({ status: "completed", updated_at: now })
          .eq("id", schedule.id);
        continue;
      }

      const functionsUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "") + "/functions/v1/bank-transfer";
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      try {
        const transferResponse = await fetch(functionsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userId: schedule.user_id,
            organizationId: schedule.organization_id,
            amount: schedule.amount,
            accountNumber: schedule.beneficiary_account,
            bankCode: schedule.bank_code,
            bankName: schedule.bank_name,
            beneficiaryName: schedule.beneficiary_name,
            narration: `Scheduled: ${schedule.narration || schedule.frequency} transfer`,
            fee: 0,
          }),
        });

        const transferResult = await transferResponse.json();

        if (transferResponse.ok && transferResult.success) {
          const nextRun = computeNextRun(schedule);

          const updateData: any = {
            last_run: now,
            total_executions: schedule.total_executions + 1,
            total_amount: Number(schedule.total_amount) + Number(schedule.amount),
            updated_at: now,
          };

          if (nextRun) {
            updateData.next_run = nextRun;
          } else {
            updateData.status = "completed";
          }

          await supabase
            .from("scheduled_transfers")
            .update(updateData)
            .eq("id", schedule.id);

          await supabase
            .from("scheduled_transfer_logs")
            .insert({
              scheduled_transfer_id: schedule.id,
              status: "success",
              amount: schedule.amount,
              reference: transferResult.reference || null,
            });

          processed++;
        } else {
          failed++;

          await supabase
            .from("scheduled_transfer_logs")
            .insert({
              scheduled_transfer_id: schedule.id,
              status: "failed",
              amount: schedule.amount,
              error_message: transferResult.error || "Unknown error",
            });

          await supabase.from("notifications").insert({
            user_id: schedule.user_id,
            organization_id: schedule.organization_id,
            title: "Scheduled Transfer Failed",
            message: `Scheduled transfer of ₦${schedule.amount} to ${schedule.beneficiary_name} failed. ${transferResult.error || ""}`,
          });
        }
      } catch (transferErr: any) {
        failed++;

        await supabase
          .from("scheduled_transfer_logs")
          .insert({
            scheduled_transfer_id: schedule.id,
            status: "failed",
            amount: schedule.amount,
            error_message: transferErr.message,
          });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: schedules.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
