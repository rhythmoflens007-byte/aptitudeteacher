/**
 * Draws a shareable scorecard image (1080×1350, the size Instagram and WhatsApp show best) and
 * shares it with the phone's share sheet, or downloads it where sharing files isn't supported.
 */
import { download } from "@/lib/reminder";

export type ScoreStat = { label: string; value: string };
export type ScoreBar = { label: string; value: number };

export type Scorecard = {
  eyebrow: string; // "Mock test" / "My progress"
  name: string;
  headline: string; // "8 / 10" or "Level 4"
  caption: string; // "80% accuracy"
  stats: ScoreStat[];
  bars: ScoreBar[];
  footer: string; // "Practising with Aptitude Teacher"
};

const W = 1080;
const H = 1350;
const BAR_COLORS = ["#5b5bf5", "#ff6b5c", "#14b8a6", "#f5a524"];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
  return `${out}…`;
}

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export async function drawScorecard(card: Scorecard): Promise<Blob> {
  await document.fonts.ready;
  // The page's own font stack, so Hindi, Tamil and Telugu names draw in the same fonts as the app.
  const family = getComputedStyle(document.body).fontFamily;
  const font = (weight: number, size: number) => `${weight} ${size}px ${family}`;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#5b5bf5");
  bg.addColorStop(0.5, "#9b5cf6");
  bg.addColorStop(0.85, "#ff6b5c");
  bg.addColorStop(1, "#ffc53d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft light blobs for depth.
  for (const [x, y, r, a] of [
    [900, 160, 320, 0.18],
    [120, 1180, 380, 0.12],
  ]) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(255,255,255,${a})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  // Header: logo and app name.
  try {
    const logo = await loadImage("/icons/icon-192.png");
    ctx.save();
    roundRect(ctx, 72, 72, 96, 96, 26);
    ctx.clip();
    ctx.drawImage(logo, 72, 72, 96, 96);
    ctx.restore();
  } catch {
    /* the card still works without the logo */
  }
  ctx.fillStyle = "#fff";
  ctx.font = font(700, 40);
  ctx.textBaseline = "middle";
  ctx.fillText("Aptitude Teacher", 196, 120);

  // White panel.
  const px = 72;
  const py = 230;
  const pw = W - 144;
  const ph = H - 300 - 72;
  ctx.save();
  ctx.shadowColor = "rgba(23,23,31,0.25)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, px, py, pw, ph, 56);
  ctx.fill();
  ctx.restore();

  const inner = px + 64;
  const innerW = pw - 128;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#8a55ef";
  ctx.font = font(700, 30);
  ctx.fillText(fit(ctx, card.eyebrow.toUpperCase(), innerW), inner, py + 100);

  ctx.fillStyle = "#17171f";
  ctx.font = font(700, 52);
  ctx.fillText(fit(ctx, card.name, innerW), inner, py + 170);

  ctx.font = font(800, 150);
  const headline = ctx.createLinearGradient(inner, 0, inner + 600, 0);
  headline.addColorStop(0, "#5b5bf5");
  headline.addColorStop(1, "#ff6b5c");
  ctx.fillStyle = headline;
  ctx.fillText(fit(ctx, card.headline, innerW), inner - 6, py + 340);

  ctx.fillStyle = "#5c5c6b";
  ctx.font = font(600, 36);
  ctx.fillText(fit(ctx, card.caption, innerW), inner, py + 405);

  // Stat chips, two per row.
  const chipW = (innerW - 24) / 2;
  card.stats.slice(0, 4).forEach((s, i) => {
    const x = inner + (i % 2) * (chipW + 24);
    const y = py + 460 + Math.floor(i / 2) * 140;
    ctx.fillStyle = "#f4f2fb";
    roundRect(ctx, x, y, chipW, 116, 32);
    ctx.fill();
    ctx.fillStyle = "#5c5c6b";
    ctx.font = font(600, 26);
    ctx.fillText(fit(ctx, s.label, chipW - 56), x + 28, y + 44);
    ctx.fillStyle = "#17171f";
    ctx.font = font(800, 42);
    ctx.fillText(fit(ctx, s.value, chipW - 56), x + 28, y + 94);
  });

  // Bars (topic mastery or test sections).
  const barsTop = py + 460 + Math.ceil(Math.min(card.stats.length, 4) / 2) * 140 + 24;
  card.bars.slice(0, 3).forEach((b, i) => {
    const y = barsTop + i * 72;
    const pct = Math.max(0, Math.min(100, Math.round(b.value)));
    ctx.fillStyle = "#17171f";
    ctx.font = font(600, 28);
    ctx.fillText(fit(ctx, b.label, innerW - 120), inner, y);
    ctx.textAlign = "right";
    ctx.fillText(`${pct}%`, inner + innerW, y);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ece9f6";
    roundRect(ctx, inner, y + 16, innerW, 16, 8);
    ctx.fill();
    ctx.fillStyle = BAR_COLORS[i % BAR_COLORS.length];
    roundRect(ctx, inner, y + 16, Math.max(16, (innerW * pct) / 100), 16, 8);
    ctx.fill();
  });

  ctx.fillStyle = "#fff";
  ctx.font = font(600, 30);
  ctx.textAlign = "center";
  ctx.fillText(fit(ctx, card.footer, W - 144), W / 2, H - 52);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas"))), "image/png"));
}

/** Opens the share sheet with the image (phones), or downloads it. Returns what happened. */
export async function shareScorecard(card: Scorecard, filename: string): Promise<"shared" | "saved" | "cancelled"> {
  const blob = await drawScorecard(card);
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: card.eyebrow, text: `${card.headline} · ${card.caption}` });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled";
    }
  }
  download(blob, filename);
  return "saved";
}
