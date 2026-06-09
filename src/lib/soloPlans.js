import { supabase } from "./supabaseClient.js";
import { sendPushForNotification } from "./notifications.js";

const PLAN_FIELDS = `
  id,
  match_id,
  proposed_by,
  status,
  day,
  time_label,
  place,
  activity,
  place_lat,
  place_lng,
  confirmed_by,
  confirmed_at,
  created_at,
  updated_at
`.trim();

export const PLAN_DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

export const PLAN_TIME_PRESETS = [
  "Morning",
  "Lunch",
  "Afternoon",
  "After class",
  "Evening",
  "Night",
];

export function dayLabel(value) {
  return PLAN_DAYS.find((d) => d.value === value)?.label ?? value;
}

export function describePlan(plan) {
  if (!plan) return "";
  return [
    dayLabel(plan.day),
    plan.time_label,
    plan.place,
    plan.activity,
  ].filter(Boolean).join(" · ");
}

export async function getSoloPlan(matchId) {
  if (!matchId) return null;

  const { data, error } = await supabase
    .from("solo_plans")
    .select(PLAN_FIELDS)
    .eq("match_id", matchId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw error;
  }
  return data ?? null;
}

export async function proposeSoloPlan(matchId, fields) {
  const { data, error } = await supabase.rpc("propose_solo_plan", {
    p_match_id: matchId,
    p_day: fields.day,
    p_time_label: fields.time_label,
    p_place: fields.place || null,
    p_activity: fields.activity || null,
    p_place_lat: fields.place_lat ?? null,
    p_place_lng: fields.place_lng ?? null,
  });

  if (error) throw error;
  const result = Array.isArray(data) ? data[0] ?? null : data;
  if (result?.notification_id) {
    await sendPushForNotification(result.notification_id);
  }
  return result?.plan_id ? getSoloPlan(matchId) : null;
}

export async function confirmSoloPlan(planId) {
  const { data, error } = await supabase.rpc("confirm_solo_plan", {
    p_plan_id: planId,
  });

  if (error) throw error;
  const result = Array.isArray(data) ? data[0] ?? null : data;
  if (result?.notification_id) {
    await sendPushForNotification(result.notification_id);
  }
  return result?.plan_id ? getSoloPlanById(result.plan_id) : null;
}

export function subscribeSoloPlan(matchId, onChange) {
  if (!matchId) return () => {};

  const channel = supabase
    .channel(`solo_plans:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "solo_plans",
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => onChange(payload.new ?? null)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export async function getSoloPlanById(planId) {
  if (!planId) return null;

  const { data, error } = await supabase
    .from("solo_plans")
    .select(PLAN_FIELDS)
    .eq("id", planId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}
