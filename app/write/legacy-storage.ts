"use client";

import { removeDraft } from "./draft-store";
import { forgetReview } from "./review-store";

// Until 2026-10-25, /write without an essay was a sample exam run (one prompt
// per section, practice or mock) with a clock saved in localStorage that kept
// counting. Both are gone; this clears what they left in the browser: the
// clocks, the runs' drafts and carets, their reviews, and their counts in the
// memory across essays. Safe to delete once no browser has data from before
// then.

const SAMPLE_RUNS = ["chien-retrouve", "teletravail"].flatMap((prompt) => [`${prompt}:practice`, `${prompt}:mock`]);

export function removeSampleRuns() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("ink:timer:")) localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked: there's nothing saved to clear either.
  }
  for (const id of SAMPLE_RUNS) {
    removeDraft(id);
    forgetReview(id);
  }
}
