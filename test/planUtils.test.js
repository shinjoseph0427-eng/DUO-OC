import assert from "node:assert/strict";
import { dayLabel, describePlan } from "../src/lib/planUtils.js";

assert.equal(dayLabel("fri"), "Fri");
assert.equal(dayLabel("someday"), "someday");

assert.equal(
  describePlan({
    day: "sat",
    time_label: "Evening",
    place: "Irvine Spectrum",
    activity: "coffee",
  }),
  "Sat · Evening · Irvine Spectrum · coffee",
);

assert.equal(
  describePlan({ day: "sun", time_label: "Lunch", place: null, activity: "" }),
  "Sun · Lunch",
);
