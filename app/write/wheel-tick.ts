// The wheel's tick: a short click each time a value passes the middle row,
// like the iOS picker. Made in Web Audio (a 12ms burst of noise through a
// band-pass), so there's no file to load and it plays the instant it's
// asked. Browsers only let audio start after a click or key press, so
// `wake()` runs on the first one inside the wheel; until then it's silent.

let ctx: AudioContext | null = null;
let click: AudioBuffer | null = null;
let lastAt = 0;

/** Call from a pointer or key event: audio may only start inside one. */
export function wake() {
  if (typeof AudioContext === "undefined") return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

export function tick() {
  if (!ctx || ctx.state !== "running") return;
  // A fast flick passes rows faster than ticks can be told apart; one per 28ms.
  const now = performance.now();
  if (now - lastAt < 28) return;
  lastAt = now;

  click ??= makeClick(ctx);
  const source = ctx.createBufferSource();
  source.buffer = click;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3200;
  band.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.value = 0.35;
  source.connect(band).connect(gain).connect(ctx.destination);
  source.start();
}

function makeClick(ctx: AudioContext) {
  const length = Math.floor(ctx.sampleRate * 0.012);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const decay = (1 - i / length) ** 5;
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  return buffer;
}
