// Renderiza scene.html quadro a quadro (Chromium headless) e codifica em MP4 com ffmpeg.
// Uso: node render.mjs [--scale 2] [--fps 60] [--subframes 2] [--preview 0.5,1.2,...]
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ffmpegPath from "ffmpeg-static";
import { chromium } from "playwright-core";
import { renderAudio } from "./audio.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "out");
mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const scale = Number(opt("scale", "1"));
const fps = Number(opt("fps", "60"));
const subframes = Math.max(1, Number(opt("subframes", "2")));
const previewArg = args.includes("--preview") ? opt("preview", "") : null;

// Sem CHROMIUM_PATH, usa o Chromium baixado pelo próprio Playwright (npx playwright-core install chromium).
const chromiumPath = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].find((p) => p && existsSync(p));

const browser = await chromium.launch({
  executablePath: chromiumPath,
  args: ["--force-color-profile=srgb", "--disable-lcd-text", "--font-render-hinting=none"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
await page.goto(pathToFileURL(path.join(here, "scene.html")).href);
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.DURATION);

const shot = async (t) => {
  await page.evaluate((time) => window.renderFrame(time), t);
  return page.screenshot({ type: "png", animations: "disabled" });
};

if (previewArg !== null) {
  const times = previewArg
    ? previewArg.split(",").map(Number)
    : Array.from({ length: Math.ceil(duration / 0.5) }, (_, i) => i * 0.5 + 0.25);
  const dir = path.join(outDir, "preview");
  mkdirSync(dir, { recursive: true });
  const { writeFileSync } = await import("node:fs");
  for (const t of times) {
    writeFileSync(path.join(dir, `t_${t.toFixed(2).padStart(5, "0")}.png`), await shot(t));
  }
  await browser.close();
  console.log(`preview: ${times.length} quadros em ${dir}`);
  process.exit(0);
}

const audioPath = path.join(outDir, "gliconexo-motion.wav");
renderAudio(audioPath, duration);

const suffix = scale === 2 ? "-4k" : "";
const outFile = path.join(outDir, `gliconexo-motion${suffix}.mp4`);
const captureFps = fps * subframes;
const totalFrames = Math.round(duration * captureFps);
const vf = [
  subframes > 1 ? `tmix=frames=${subframes}` : null,
  subframes > 1 ? `fps=${fps}` : null,
  "format=yuv420p",
].filter(Boolean).join(",");

const ff = spawn(ffmpegPath, [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(captureFps), "-c:v", "png", "-i", "-",
  "-i", audioPath,
  "-vf", vf,
  "-c:v", "libx264", "-preset", "slow", "-crf", scale === 2 ? "20" : "18",
  "-profile:v", "high", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-c:a", "aac", "-b:a", "192k",
  "-movflags", "+faststart", "-shortest",
  outFile,
], { stdio: ["pipe", "inherit", "inherit"] });
const ffDone = new Promise((resolve, reject) => {
  ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg saiu com código ${code}`))));
});

const started = Date.now();
for (let i = 0; i < totalFrames; i++) {
  const buf = await shot(i / captureFps);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % captureFps === 0) {
    const s = ((Date.now() - started) / 1000).toFixed(0);
    console.log(`quadro ${i}/${totalFrames} (${s}s)`);
  }
}
ff.stdin.end();
await ffDone;
await browser.close();
console.log(`vídeo: ${outFile}`);
