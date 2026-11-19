/**
 * ARENA CHESS AUDIO & HAPTICS ENGINE (POLISHED)
 * Pure Web Audio API synthesizers — 0kb external asset dependencies.
 * iOS Safari User-Gesture Unlocking, Pop-Free Exponential Decay (0.0001),
 * Shared Tone Helper, and Global Mute Toggle.
 */

let audioCtx = null;
let isMuted = false;

// Unlock Web Audio Context on the first user interaction (touch/click)
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch {}
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchstart', unlock);
  };

  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setChessAudioMuted(muted) {
  isMuted = Boolean(muted);
}

export function getChessAudioMuted() {
  return isMuted;
}

/**
 * Shared tone synthesizer with zero-click exponential ramp down to 0.0001
 */
function playTone({ freqStart, freqEnd, type = 'sine', duration = 0.05, peakGain = 0.3 }) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }

    gain.gain.setValueAtTime(peakGain, now);
    // CRITICAL: Ramp down to 0.0001 (not 0.01) to eliminate DC offset click
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {}
}

export function playMoveSound() {
  playTone({ freqStart: 320, freqEnd: 140, type: 'sine', duration: 0.05, peakGain: 0.25 });
  triggerHaptic(10);
}

export function playCaptureSound() {
  playTone({ freqStart: 200, freqEnd: 70, type: 'triangle', duration: 0.08, peakGain: 0.4 });
  triggerHaptic(25);
}

export function playCheckSound() {
  playTone({ freqStart: 520, freqEnd: 520, type: 'sine', duration: 0.12, peakGain: 0.2 });
  playTone({ freqStart: 660, freqEnd: 660, type: 'sine', duration: 0.12, peakGain: 0.2 });
  triggerHaptic([30, 40, 30]);
}

export function playVictorySound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
    triggerHaptic([40, 60, 40, 60, 80]);
  } catch {}
}

export function playDefeatSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [440, 415.3, 370, 329.6];
    notes.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  } catch {}
}

export function triggerHaptic(pattern = 15) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}
