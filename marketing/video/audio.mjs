// Trilha e efeitos sonoros sintetizados (sem samples de terceiros), sincronizados com scene.html.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260925);
const noise = () => rnd() * 2 - 1;

class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set("lp", 1000, 0.707); }
  set(type, fc, q) {
    const w = (TAU * Math.min(fc, SR * 0.45)) / SR;
    const cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
    let b0, b1, b2;
    if (type === "lp") { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
    else if (type === "hp") { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = (-2 * cw) / a0; this.a2 = (1 - al) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export function renderAudio(outPath, duration = 13) {
  const N = Math.ceil(duration * SR);
  const bus = {
    drums: [new Float32Array(N), new Float32Array(N)],
    duck: [new Float32Array(N), new Float32Array(N)],
    sfx: [new Float32Array(N), new Float32Array(N)],
    send: new Float32Array(N),
  };
  const add = (b, i, v, pan = 0) => {
    if (i < 0 || i >= N) return;
    b[0][i] += v * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    b[1][i] += v * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  };
  const S = (t) => Math.round(t * SR);

  // ---------- grade musical ----------
  const BPM = 124;
  const beat = 60 / BPM;
  const bar = beat * 4;
  const T0 = 0.8;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CHORDS = [
    { notes: [60, 64, 67, 71, 74], bass: 36 }, // Cmaj9
    { notes: [57, 60, 64, 67, 71], bass: 33 }, // Am9
    { notes: [53, 57, 60, 64, 67], bass: 41 }, // Fmaj9
    { notes: [55, 59, 62, 64, 69], bass: 43 }, // G6/9
  ];
  const chordAt = (t) => CHORDS[Math.max(0, Math.floor((t - T0) / bar)) % 4];

  const kicks = [];
  for (let t = T0; t < 10.0 - 1e-6; t += beat) {
    if (t > 1.99 && t < 2.97) continue;
    kicks.push(t);
  }
  const duckGain = new Float32Array(N).fill(1);
  for (const k of kicks) {
    for (let i = S(k); i < Math.min(N, S(k + 0.32)); i++) {
      const u = (i - S(k)) / SR;
      duckGain[i] = Math.min(duckGain[i], 1 - 0.62 * Math.exp(-u / 0.09));
    }
  }

  // ---------- instrumentos ----------
  function kick(t0, g = 0.95) {
    let ph = 0;
    for (let i = S(t0); i < Math.min(N, S(t0 + 0.42)); i++) {
      const u = (i - S(t0)) / SR;
      const f = 46 + 120 * Math.exp(-u / 0.032);
      ph += (TAU * f) / SR;
      const env = Math.exp(-u / 0.2) * Math.min(1, u / 0.0015);
      const v = Math.tanh(1.6 * Math.sin(ph)) * env * g + noise() * Math.exp(-u / 0.0025) * 0.25 * g;
      add(bus.drums, i, v);
    }
  }
  function clap(t0, g = 0.32) {
    const bp = new Biquad(); bp.set("bp", 1350, 0.9);
    for (let i = S(t0); i < Math.min(N, S(t0 + 0.3)); i++) {
      const u = (i - S(t0)) / SR;
      let env = Math.exp(-u / 0.11);
      for (const off of [0, 0.011, 0.022]) if (u >= off && u < off + 0.009) env = Math.max(env, Math.exp(-(u - off) / 0.004) * 1.4);
      const v = bp.run(noise()) * env * g * 3;
      add(bus.drums, i, v, 0.05);
      bus.send[i] += v * 0.25;
    }
  }
  function hat(t0, open = false, g = 0.1, pan = 0.25) {
    const hp = new Biquad(); hp.set("hp", 7200, 0.8);
    const len = open ? 0.22 : 0.06;
    for (let i = S(t0); i < Math.min(N, S(t0 + len)); i++) {
      const u = (i - S(t0)) / SR;
      add(bus.drums, i, hp.run(noise()) * Math.exp(-u / (open ? 0.07 : 0.018)) * g, pan);
    }
  }
  function bass(t0, dur, midi, g = 0.3) {
    const f = hz(midi);
    let ph = 0;
    for (let i = S(t0); i < Math.min(N, S(t0 + dur + 0.05)); i++) {
      const u = (i - S(t0)) / SR;
      ph += (TAU * f) / SR;
      const env = Math.min(1, u / 0.006) * (u < dur ? 1 - 0.35 * (u / dur) : Math.max(0, 1 - (u - dur) / 0.05));
      const v = (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)) * env * g;
      add(bus.duck, i, v);
    }
  }
  // pad aditivo: o "filtro" é aplicado por harmônico (sem aliasing), com ressonância opcional
  function pad(t0, t1, midi, g, cutoffAt, resAt, pan) {
    const f = hz(midi);
    const det = [-0.006, 0, 0.0065];
    const phs = det.map(() => rnd() * TAU);
    const H = 10;
    for (let i = S(t0); i < Math.min(N, S(t1 + 0.45)); i++) {
      const t = i / SR;
      const u = t - t0;
      const env = Math.min(1, u / 0.14) * (t < t1 ? 1 : Math.max(0, 1 - (t - t1) / 0.45));
      if (env <= 0) continue;
      const fc = cutoffAt(t), res = resAt(t);
      let v = 0;
      for (let d = 0; d < det.length; d++) {
        const fd = f * (1 + det[d]);
        const base = phs[d] + TAU * fd * u;
        for (let h = 1; h <= H; h++) {
          const fh = fd * h;
          if (fh > 12000) break;
          const r = fh / fc;
          let amp = 1 / (h * Math.sqrt(1 + r * r * r * r));
          if (res > 0) amp += (res / h) * Math.exp(-Math.pow((fh - fc) / (0.22 * fc), 2));
          v += Math.sin(base * h) * amp;
        }
      }
      add(bus.duck, i, v * env * g, pan);
      bus.send[i] += v * env * g * 0.35;
    }
  }
  function pluck(t0, midi, g = 0.08, pan = 0, decay = 0.28) {
    const f = hz(midi);
    for (let i = S(t0); i < Math.min(N, S(t0 + decay * 4)); i++) {
      const u = (i - S(t0)) / SR;
      let v = 0;
      for (let h = 1; h <= 6; h++) v += (Math.sin(TAU * f * h * u) / h) * Math.exp((-u * (1 + h * 0.9)) / decay);
      v *= Math.min(1, u / 0.002);
      add(bus.duck, i, v * g, pan);
      bus.send[i] += v * g * 0.4;
    }
  }
  function chime(t0, midis, g = 0.16, pan = 0, decay = 1.1) {
    for (const m of midis) {
      const f = hz(m);
      for (const [ratio, amp] of [[1, 1], [2.756, 0.32], [5.404, 0.12]]) {
        for (let i = S(t0); i < Math.min(N, S(t0 + decay * 3)); i++) {
          const u = (i - S(t0)) / SR;
          const v = Math.sin(TAU * f * ratio * u) * amp * Math.exp(-u / (decay / ratio ** 0.5)) * Math.min(1, u / 0.002) * g;
          add(bus.sfx, i, v, pan);
          bus.send[i] += v * 0.9;
        }
      }
    }
  }
  function whoosh(t0, dur, f0, f1, f2, g = 0.2, pan0 = -0.5, pan1 = 0.5, q = 1.4) {
    const bp = new Biquad();
    const n0 = S(t0), n1 = Math.min(N, S(t0 + dur));
    for (let i = n0; i < n1; i++) {
      const p = (i - n0) / (n1 - n0);
      if ((i - n0) % 32 === 0) {
        const fc = p < 0.5 ? f0 * Math.pow(f1 / f0, p * 2) : f1 * Math.pow(f2 / f1, (p - 0.5) * 2);
        bp.set("bp", fc, q);
      }
      const env = Math.pow(Math.sin(Math.PI * p), 1.6);
      const v = bp.run(noise()) * env * g * 2.2;
      add(bus.sfx, i, v, pan0 + (pan1 - pan0) * p);
      bus.send[i] += v * 0.3;
    }
  }
  function tone(t0, dur, fA, fB, g, pan = 0, attack = 0.01, shape = 1) {
    let ph = 0;
    for (let i = S(t0); i < Math.min(N, S(t0 + dur)); i++) {
      const p = (i - S(t0)) / (dur * SR);
      const u = p * dur;
      ph += (TAU * (fA * Math.pow(fB / fA, p))) / SR;
      const env = Math.min(1, u / attack) * Math.pow(1 - p, shape);
      add(bus.sfx, i, Math.sin(ph) * env * g, pan);
    }
  }
  function click(t0, g = 0.35, f = 1800, pan = 0) {
    const hp = new Biquad(); hp.set("hp", 2500, 0.7);
    for (let i = S(t0); i < Math.min(N, S(t0 + 0.05)); i++) {
      const u = (i - S(t0)) / SR;
      const v = (Math.sin(TAU * f * u) * Math.exp(-u / 0.009) * 0.7 + hp.run(noise()) * Math.exp(-u / 0.0022)) * g;
      add(bus.sfx, i, v, pan);
      bus.send[i] += v * 0.15;
    }
  }
  const pop = (t0, g = 0.45, pan = 0) => { tone(t0, 0.09, 950, 230, g, pan, 0.0015, 2); click(t0, g * 0.25, 2600, pan); };
  const tick = (t0, g = 0.07, pan = 0) => click(t0, g, 3400 + rnd() * 900, pan);

  // ---------- arranjo ----------
  // pad
  const padCut = (t) => {
    if (t < T0) return 260 * Math.pow(3200 / 260, t / T0);
    if (t < 2.0) return 3200;
    if (t < 3.0) return 700 * Math.pow(4200 / 700, (t - 2.0) / 1.0);
    if (t < 9.0) return 3000;
    if (t < 10.0) return 3000 * Math.pow(2.2, (t - 9.0) / 1.0);
    return 6600;
  };
  const padRes = (t) => (t >= 2.0 && t < 3.05 ? 2.2 : t >= 9.0 && t < 10.0 ? 1.1 : 0.15);
  const barStarts = [0];
  for (let b = T0; b < duration; b += bar) barStarts.push(b);
  for (let k = 0; k < barStarts.length; k++) {
    const a = barStarts[k];
    const isLast = k === barStarts.length - 1 || barStarts[k + 1] >= duration - 0.4;
    const b = isLast ? duration - 0.55 : barStarts[k + 1] + 0.04;
    const ch = a < T0 ? CHORDS[0] : chordAt(a + 0.01);
    ch.notes.forEach((m, j) => pad(a, b, m, 0.022, padCut, padRes, (j - 2) * 0.28));
    if (isLast) break;
  }
  // bateria
  kicks.forEach((k) => kick(k, k < 2.0 ? 0.75 : 0.95));
  for (let t = T0, n = 0; t < 10.0 - 1e-6; t += beat, n++) {
    if (n % 2 === 1 && t > 2.97) clap(t, t >= 9.0 ? 0.38 : 0.32);
    if (!(t > 1.99 && t < 2.97)) hat(t + beat / 2, t >= 9.0, t >= 9.0 ? 0.09 : 0.1, 0.3);
    if (t >= 5.6 && t < 10.0) {
      hat(t + beat / 4, false, 0.045, -0.35);
      hat(t + (3 * beat) / 4, false, 0.045, -0.35);
    }
  }
  // baixo em colcheias (a partir do botão)
  for (let t = T0; t < 10.0 - 1e-6; t += beat / 2) {
    if (t < 2.97) continue;
    bass(t, beat / 2 - 0.03, chordAt(t + 0.001).bass, 0.3);
  }
  // arpejo de plucks
  const arp = [0, 2, 4, 2, 1, 3, 4, 3];
  let ai = 0;
  for (let t = 3.0 + beat / 4; t < 9.0; t += beat / 2) {
    const ch = chordAt(t);
    pluck(t, ch.notes[arp[ai % arp.length]] + 12, 0.05, ai % 2 ? 0.45 : -0.45);
    ai++;
  }

  // ---------- efeitos sincronizados com as cenas ----------
  whoosh(0.0, 0.85, 300, 1400, 5200, 0.12, 0, 0, 0.9); // swell
  tone(0.05, 0.75, 220, 880, 0.05, 0, 0.5, 0.3); // riser
  click(0.02, 0.12, 2200); // ponto
  click(0.57, 0.14, 3000, 0.35); // nó teal
  click(0.66, 0.14, 2700, -0.35); // nó azul
  pop(0.62, 0.55); // logo completo
  chime(1.1, [88, 95], 0.13, 0.25); // ding do card
  whoosh(1.4, 0.72, 350, 2600, 700, 0.22, -0.7, 0.7, 1.6); // tile 3D
  tone(2.0, 1.0, hz(79), hz(79), 0.035, 0, 0.35, 0.2); // tom harmônico da cápsula
  tone(2.0, 1.0, hz(86), hz(86), 0.015, 0.2, 0.5, 0.3);
  pop(3.0, 0.3); // cápsula vira botão
  click(3.49, 0.5, 1500, 0.2); pop(3.5, 0.35, 0.2); // tap
  whoosh(3.78, 0.5, 120, 1800, 3800, 0.2, -0.2, 0.2, 1.1); // ripple
  tone(3.78, 0.45, 42, 95, 0.35, 0, 0.05, 1.5); // sub-whoosh
  click(3.93, 0.3, 2200, 0.1); click(3.965, 0.22, 1700, 0.1); // obturador
  tone(4.0, 0.22, 1200, 2600, 0.035, -0.3, 0.02, 1); // varredura do OCR
  pluck(4.17, 84, 0.07, 0); // valor reconhecido
  click(4.44, 0.45, 1500, 0.1); // tap confirmar
  chime(4.48, [84], 0.1, 0); chime(4.56, [91], 0.1, 0.1); // confirmação
  for (let i = 0; i < 8; i++) { // cartas
    const a = 4.6 + i * 0.055;
    whoosh(a, 0.2, 900, 3600, 1600, 0.09, i % 2 ? 0.5 : -0.5, 0, 1.8);
    tick(a + 0.2, 0.09, (i - 3.5) * 0.2);
  }
  [5.0, 5.12, 5.24].forEach((a) => click(a, 0.08, 2400)); // palavras
  const SUB = "Cada medição com data, horário e contexto.";
  for (let c = 1; c <= SUB.length; c++) {
    if (SUB[c - 1] === " ") continue;
    tick(5.6 + (c / SUB.length) * 0.52, 0.05 + rnd() * 0.02, (rnd() - 0.5) * 0.4);
  }
  whoosh(6.0, 0.25, 800, 2600, 1400, 0.07, 0.3, -0.2, 1.8); // chip offline
  whoosh(6.55, 0.8, 500, 1600, 600, 0.12, 0.2, -0.2, 0.9); // rolagem
  pop(7.45, 0.28, -0.2); // nova linha
  [96, 100, 103, 108].forEach((m, i) => chime(7.9 + i * 0.045, [m], 0.045, (i - 1.5) * 0.3, 0.7)); // desbloqueio
  click(8.43, 0.5, 1700, 0.25); pop(8.44, 0.25, 0.25); // seleção
  whoosh(8.95, 0.45, 400, 2400, 900, 0.13, -0.3, 0.3, 1.2); // morph
  const PENTA = [76, 79, 81, 83, 86, 88, 91];
  [0, 1, 2, 3, 5, 6, 7].forEach((slot, i) => {
    const at = 9.28 + ((150 + (slot * 880) / 7 - 100) / 960) * 0.5;
    pluck(at, PENTA[i], 0.07, (slot - 3.5) * 0.18, 0.22);
  });
  [9.52, 9.62, 9.72].forEach((a, i) => pop(a, 0.2, (i - 1) * 0.3)); // stats
  // outro
  tone(10.0, 0.6, 180, 60, 0.05, 0, 0.05, 1);
  [10.24, 10.3, 10.36].forEach((a, i) => tick(a, 0.07, (i - 1) * 0.3));
  tone(10.6, 0.75, 48, 48, 0.38, 0, 0.18, 1.4); // sub-pulso
  whoosh(10.55, 0.7, 200, 900, 300, 0.06, 0, 0, 0.8);
  for (let i = 0; i < 9; i++) tick(11.3 + i * 0.045 + 0.05, 0.04, -0.2 + i * 0.05);
  chime(11.72, [84, 88, 91, 96], 0.07, 0, 1.6); // chime final

  // ---------- mixagem ----------
  const L = new Float32Array(N), R = new Float32Array(N);
  const master = [new Biquad(), new Biquad()];
  const musicLp = (t) => (t < 10.0 ? 18000 : 18000 * Math.pow(420 / 18000, Math.min(1, (t - 10.0) / 0.6)));
  const musicGain = (t) => {
    if (t < 10.0) return 1;
    if (t < 10.6) return 1 - 0.25 * ((t - 10.0) / 0.6);
    return 0.75;
  };
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (i % 32 === 0) { const fc = musicLp(t); master[0].set("lp", fc, 0.9); master[1].set("lp", fc, 0.9); }
    const g = musicGain(t);
    const mL = (bus.drums[0][i] + bus.duck[0][i] * duckGain[i]) * g;
    const mR = (bus.drums[1][i] + bus.duck[1][i] * duckGain[i]) * g;
    L[i] = master[0].run(mL) + bus.sfx[0][i];
    R[i] = master[1].run(mR) + bus.sfx[1][i];
  }

  // reverb (Freeverb simplificado)
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((len) => ({ len, buf: new Float32Array(len), idx: 0, store: 0 }));
  const aps = [556, 441, 341].map((len) => ({ len, buf: new Float32Array(len), idx: 0 }));
  const wet = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = bus.send[i] * 0.015;
    let y = 0;
    for (const c of combs) {
      const out = c.buf[c.idx];
      c.store = out * 0.72 + c.store * 0.28;
      c.buf[c.idx] = x + c.store * 0.84;
      c.idx = (c.idx + 1) % c.len;
      y += out;
    }
    for (const a of aps) {
      const b = a.buf[a.idx];
      const o = -y + b;
      a.buf[a.idx] = y + b * 0.5;
      a.idx = (a.idx + 1) % a.len;
      y = o;
    }
    wet[i] = y;
  }
  const delay = Math.round(0.013 * SR);
  for (let i = 0; i < N; i++) {
    L[i] += wet[i] * 0.9;
    R[i] += (i >= delay ? wet[i - delay] : 0) * 0.9;
  }

  // fade para o silêncio absoluto no último quadro + normalização
  const fadeA = duration - 1.1, fadeB = duration - 0.05;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const f = t < fadeA ? 1 : t > fadeB ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * (t - fadeA)) / (fadeB - fadeA));
    L[i] *= f; R[i] *= f;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 1.25 / (peak || 1);
  const buf = Buffer.alloc(44 + N * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
  const lim = (x) => Math.tanh(x * norm) * 0.89;
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(lim(L[i]) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(lim(R[i]) * 32767), 46 + i * 4);
  }
  writeFileSync(outPath, buf);
  return outPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = path.join(here, "out", "gliconexo-motion.wav");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(path.dirname(out), { recursive: true });
  console.time("audio");
  renderAudio(out);
  console.timeEnd("audio");
  console.log(out);
}
