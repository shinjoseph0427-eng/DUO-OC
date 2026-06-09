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
