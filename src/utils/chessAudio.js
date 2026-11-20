/**
 * ARENA CHESS AUDIO — Pure Acoustic Wood-Board Sound Engine
 * Uses authentic recorded wooden piece samples (move.mp3 & capture.mp3)
 * for piece movements, captures, checks, and game resolutions.
 * Zero arcade beeps, zero harsh synthesizers.
 */

let audioCtx = null;
let master = null;
let noiseBuf = null;
let isMuted = false;
const samples = {};

const SAMPLE_FILES = {
  move: 'move.mp3',
  capture: 'capture.mp3',
};

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    // Master chain: 7kHz lowpass + compressor for smooth, non-fatiguing audio
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    const comp = audioCtx.createDynamicsCompressor();
    master = audioCtx.createGain();
    master.gain.value = 0.9;
    master.connect(lp);
    lp.connect(comp);
    comp.connect(audioCtx.destination);
  }
  if (audioCtx.state !== 'running') {
    try { audioCtx.resume()?.catch?.(() => {}); } catch {}
  }
  return audioCtx;
}

// Call once on mount / first touch. Unlocks iOS Safari Web Audio API.
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx) {
      try {
        const s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, 22050); // silent blip = iOS unlock
        s.connect(ctx.destination);
        s.start(0);
      } catch {}
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchend', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchend', unlock, { passive: true });
}

export async function loadChessSounds(base = '/sounds/chess') {
  const ctx = getAudioContext();
  if (!ctx) return;
  await Promise.all(
    Object.entries(SAMPLE_FILES).map(async ([name, file]) => {
      try {
        const res = await fetch(`${base}/${file}`);
        const cType = res.headers.get('content-type') || '';
        if (cType && cType.includes('text/html')) return;
        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength < 100) return;
        samples[name] = await ctx.decodeAudioData(arrayBuf);
      } catch {}
    })
  );
}

export function setChessAudioMuted(muted) { isMuted = Boolean(muted); }
export function getChessAudioMuted() { return isMuted; }

// ---------- Internal Helpers ----------
function getNoise(ctx) {
  if (!noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 0.1);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// Tactile wood hit fallback (triangle body + bandpass noise click)
function hit(ctx, t, { body = 170, click = 2200, vol = 0.45, decay = 0.07 } = {}) {
  const j = 1 + (Math.random() * 0.08 - 0.04);

  const o = ctx.createOscillator();
  const og = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(body * j * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(body * j, t + 0.03);
  og.gain.setValueAtTime(vol, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(og);
  og.connect(master);
  o.start(t);
  o.stop(t + decay + 0.01);

  const n = ctx.createBufferSource();
  n.buffer = getNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = click * j;
  bp.Q.value = 1.1;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  n.connect(bp);
  bp.connect(ng);
  ng.connect(master);
  n.start(t);
  n.stop(t + 0.04);
}

// Soft acoustic sine chime with gentle attack
function softChime(ctx, t, freq, { dur = 0.65, vol = 0.08 } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function playSample(name, vol = 1, rate = 1) {
  const buf = samples[name];
  if (!buf) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.playbackRate.value = rate * (1 + (Math.random() * 0.04 - 0.02)); // subtle humanized pitch
  const g = ctx.createGain();
  g.gain.value = vol;
  s.connect(g);
  g.connect(master);
  s.start();
  return true;
}

// ---------- Public Audio API ----------

/** 1. Normal Piece Move: Authentic wood piece placement */
export function playMoveSound() {
  if (isMuted) return;
  try {
    if (!playSample('move')) {
      const ctx = getAudioContext();
      if (ctx) hit(ctx, ctx.currentTime, { body: 170, click: 2200, vol: 0.45, decay: 0.07 });
    }
  } catch {}
  triggerHaptic(10);
}

/** 2. Piece Capture: Authentic wood impact */
export function playCaptureSound() {
  if (isMuted) return;
  try {
    if (!playSample('capture')) {
      const ctx = getAudioContext();
      if (ctx) {
        const t = ctx.currentTime;
        hit(ctx, t, { body: 130, click: 1600, vol: 0.7, decay: 0.09 });
        hit(ctx, t + 0.045, { body: 190, click: 2600, vol: 0.4, decay: 0.06 });
      }
    }
  } catch {}
  triggerHaptic(25);
}

/** 3. Check: Authoritative firm wood strike (deeper pitch) + tactile check pulse (No arcade siren) */
export function playCheckSound() {
  if (isMuted) return;
  try {
    // Reuses the authentic move.mp3 wood sound with deeper, firmer resonance
    if (!playSample('move', 1.15, 0.91)) {
      const ctx = getAudioContext();
      if (ctx) hit(ctx, ctx.currentTime, { body: 200, click: 2500, vol: 0.6, decay: 0.09 });
    }
  } catch {}
  triggerHaptic([30, 40, 30]);
}

/** 4. Victory: Warm, prestigious luxury bell chord (F-Major 9th: F, A, C, E) — gentle & relaxing */
export function playVictorySound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const t = ctx.currentTime;
      // Soft ambient Rhodes / Zen chime chord
      [349.23, 440.00, 523.25, 659.25].forEach((freq, idx) => {
        softChime(ctx, t + idx * 0.07, freq, { dur: 0.7, vol: 0.08 });
      });
    }
  } catch {}
  triggerHaptic([40, 60, 40, 60, 80]);
}

/** 5. Defeat: Muted, quiet wooden piece tap (like setting down a king / clock stopped) — zero annoying buzzer */
export function playDefeatSound() {
  if (isMuted) return;
  try {
    // Soft, quiet wood tap
    if (!playSample('move', 0.45, 0.85)) {
      const ctx = getAudioContext();
      if (ctx) hit(ctx, ctx.currentTime, { body: 140, click: 1300, vol: 0.3, decay: 0.06 });
    }
  } catch {}
  triggerHaptic(20);
}

export function triggerHaptic(pattern = 15) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}
