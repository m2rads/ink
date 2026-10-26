"use client";

import { useSyncExternalStore } from "react";

// French read aloud, for the dictionary's listen buttons. The browser's own
// speech synthesis: no key, no request, works offline, but the voice is the
// OS's, so quality varies by device (macOS and iOS ship good French voices;
// some Linux browsers have none). Without a French voice there's no button.

/** Best French voice: France's over Canada's or others, then the higher-quality "Enhanced"/"Premium" ones. */
function frenchVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase() === "fr-fr" ? 4 : 0) + (/enhanced|premium|natural/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
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
