import { useCallback, useState } from 'react';

// Post-signup onboarding guide state. Stored as the number of completed steps
// (0–5) under a dedicated key, or the literal string 'done' once finished.
const STORAGE_KEY = 'duo_oc_onboarding_v2';
const LAST_STEP = 5;

function readRaw() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function persist(val) {
  try { localStorage.setItem(STORAGE_KEY, val); } catch { /* private mode — ignore */ }
}

// Completed-count (0..5) → the next step to show (1..5), or null when finished.
function nextStepFromRaw(raw) {
  if (raw === 'done') return null;
  const completed = Number.isFinite(Number(raw)) ? Number(raw) : 0;
  return completed >= LAST_STEP ? null : completed + 1;
}

export function useOnboardingGuide(onboardingComplete) {
  const [raw, setRaw] = useState(readRaw);
  // Step 3 ("Homie accepted") is event-gated. When the guide reaches step 3 by
  // normal progression we keep it dormant until jumpToStep(3) is fired by the
  // homie_accepted event. paused is initialised so a reload mid-flow stays gated.
  const [paused, setPaused] = useState(() => nextStepFromRaw(readRaw()) === 3);

  const currentStep = nextStepFromRaw(raw);
  const isActive = Boolean(onboardingComplete) && currentStep !== null && !paused;

  const advanceStep = useCallback(() => {
    setRaw((prev) => {
      if (prev === 'done') return prev;
      const completed = Number.isFinite(Number(prev)) ? Number(prev) : 0;
      const nextCompleted = Math.min(completed + 1, LAST_STEP);
      const val = nextCompleted >= LAST_STEP ? 'done' : String(nextCompleted);
      persist(val);
      setPaused(nextStepFromRaw(val) === 3); // pause when entering step 3 normally
      return val;
    });
  }, []);

  const skipAll = useCallback(() => {
    persist('done');
    setRaw('done');
    setPaused(false);
  }, []);

  // Forward-only jump used by the homie_accepted event to surface step 3.
  const jumpToStep = useCallback((step) => {
    setRaw((prev) => {
      if (prev === 'done') return prev;
      const completed = Number.isFinite(Number(prev)) ? Number(prev) : 0;
      const targetCompleted = step - 1;
      if (targetCompleted <= completed) {
        setPaused(false); // already at/past this step — just lift the pause
        return prev;
      }
      const val = String(targetCompleted);
      persist(val);
      setPaused(false);
      return val;
    });
  }, []);

  return { currentStep, isActive, advanceStep, skipAll, jumpToStep };
}
