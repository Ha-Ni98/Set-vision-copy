import { useCallback, useState } from "react";

const STORAGE_KEY = "sv_notif_muted";

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

// Two short ascending tones (not a shipped audio file) — synthesized via the Web Audio API
// so there's no binary asset to source/license/bundle. Built fresh per call: an AudioContext
// is cheap to construct and this only ever fires on an infrequent new-request event, not a
// hot path.
function synthesizeChime(): void {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const notes = [660, 880];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
  // Contexts aren't reused across calls (infrequent event), so free it once the last note
  // finishes rather than leaking one AudioContext per chime.
  setTimeout(() => ctx.close(), (notes.length * 0.12 + 0.25) * 1000);
}

// `muted` persists across sessions (localStorage); `playChime` is a no-op while muted or in
// an environment without Web Audio (e.g. jsdom in tests).
export function useNotificationSound() {
  const [muted, setMuted] = useState(readMuted);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const playChime = useCallback(() => {
    if (muted) return;
    synthesizeChime();
  }, [muted]);

  return { muted, toggleMute, playChime };
}
