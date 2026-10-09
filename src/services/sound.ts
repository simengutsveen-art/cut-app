// Pip når pausen er ferdig. iOS krever at lyd «låses opp» av et trykk,
// så primeAudio() kalles når et sett merkes som ferdig.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function primeAudio(): void {
  const c = getContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  // Et stille, kort lydklipp låser opp lyd på iOS.
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.01);
  } catch {
    // ignorer
  }
}

/** Tre korte pip (og vibrering der det støttes). */
export function beep(): void {
  const c = getContext();
  if (c) {
    if (c.state === 'suspended') void c.resume().catch(() => undefined);
    const start = c.currentTime + 0.02;
    for (let i = 0; i < 3; i++) {
      const t = start + i * 0.28;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1320 : 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    }
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // ikke støttet
  }
}
