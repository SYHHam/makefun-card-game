// audio.js: Synthesized WebAudio sounds. No audio files, no network.

export const SOUNDS = {
  deal: 'deal',
  flip: 'flip',
  ritual: 'ritual',
  spell: 'spell',
  complete: 'complete',
  snuff: 'snuff',
  win: 'win',
  loss: 'loss',
};

let ctx = null;
let muted = false;

export function setMuted(m) {
  muted = !!m;
}

export function isMuted() {
  return muted;
}

export function initAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, durMs, type, gain, when) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.05);
}

function noise(durMs, gain, when) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + (when || 0);
  const len = Math.floor(ctx.sampleRate * durMs / 1000);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain || 0.1, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  src.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
}

export function playSound(name) {
  if (!ctx || muted) return;
  switch (name) {
    case 'deal':
      tone(520, 90, 'sine', 0.1, 0);
      tone(760, 90, 'sine', 0.08, 0.07);
      break;
    case 'flip':
      noise(50, 0.08, 0);
      break;
    case 'ritual':
      tone(392, 200, 'triangle', 0.12, 0);
      tone(523, 200, 'triangle', 0.12, 0.08);
      break;
    case 'spell':
      tone(311, 300, 'sawtooth', 0.05, 0);
      tone(233, 300, 'sawtooth', 0.05, 0.05);
      break;
    case 'complete':
      tone(523, 160, 'triangle', 0.12, 0);
      tone(659, 160, 'triangle', 0.12, 0.12);
      tone(784, 260, 'triangle', 0.12, 0.24);
      break;
    case 'snuff':
      noise(200, 0.12, 0);
      tone(110, 200, 'sine', 0.08, 0);
      break;
    case 'win':
      tone(523, 300, 'sine', 0.12, 0);
      tone(659, 300, 'sine', 0.12, 0.25);
      tone(784, 300, 'sine', 0.12, 0.5);
      tone(1046, 600, 'sine', 0.12, 0.75);
      break;
    case 'loss':
      tone(220, 900, 'sine', 0.1, 0);
      tone(165, 1200, 'sine', 0.08, 0.2);
      break;
    default:
      break;
  }
}
