"use client";

import { useSyncExternalStore } from "react";

// French read aloud, for the dictionary's listen buttons. The browser's own
// speech synthesis: no key, no request, works offline, but the voice is the
// OS's, so quality varies by device (macOS and iOS ship good French voices;
// some Linux browsers have none). Without a French voice there's no button.

// macOS lists its Eloquence character voices next to the real ones, in every
// language, and they sort first alphabetically ("Eddy (français (France))"),
// so a naive pick reads French in a robotic or cartoon voice. Last resort only.
const NOVELTY = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/;
// Natural-sounding French voices by name: Apple's, Chrome's network voice,
// Microsoft's (Edge, Windows). Whatever else exists ranks after these.
const GOOD = /^(Thomas|Audrey|Aurélie|Marie|Amélie|Google français|Microsoft .*(Denise|Henri|Vivienne|Eloise|Remy|Julie|Paul|Hortense|Claude|Yves))/;

/**
 * Best French voice: a downloaded "Premium"/"Enhanced" or neural ("Natural")
 * one first, then a known good one, France's over Canada's; never a novelty
 * voice while anything else exists.
 */
function frenchVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
  const score = (v: SpeechSynthesisVoice) =>
    (NOVELTY.test(v.name) ? -100 : 0) +
    (/premium|enhanced|natural/i.test(v.name) ? 20 : 0) +
    (GOOD.test(v.name) ? 10 : 0) +
    (v.lang.toLowerCase() === "fr-fr" ? 5 : 0);
  return voices.sort((a, b) => score(b) - score(a))[0] ?? null;
}

const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function subscribe(onChange: () => void) {
  if (!supported()) return () => {};
  // Voices load asynchronously; the list is often empty on first read.
  speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/** Whether French can be read aloud here: false on the server and until voices load. */
export function useCanSpeakFrench() {
  return useSyncExternalStore(
    subscribe,
    () => supported() && frenchVoice() !== null,
    () => false,
  );
}

/** Read `text` aloud in French, a little slower than conversation; interrupts anything already playing. */
export function speakFrench(text: string) {
  if (!supported()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = frenchVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "fr-FR";
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}
