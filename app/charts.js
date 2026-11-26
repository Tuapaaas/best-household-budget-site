// Hearth & Ledger — charts drawn with plain canvas code, no library.
// One job: turn numbers into pictures the household can read at a glance.
// Every function takes a canvas element and plain data, and draws in the
// site's own palette. Hi-DPI aware so phone screenshots stay crisp.

const GREEN = '#2e5d3a';
const AMBER = '#d98e2b';
const RED = '#b3402e';
const INK = '#22301f';
const MUTED = '#6b7263';
const GRID = '#e2dac7';
const PALETTE = ['#2e5d3a', '#d98e2b', '#7a9e7e', '#b3402e', '#5b7fa6', '#8a6d3b', '#a05a8c', '#4d7a6f', '#c96f4a'];

function setup(canvas, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.height = cssHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height: cssHeight };
}

function moneyShort(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
  return '$' + Math.round(n);
}

// Horizontal bars: one per category, labelled, with a budget marker line.
export function drawCategoryBars(canvas, rows) {
  // rows: [{label, spent, budget}]
  const rowH = 34;
  const { ctx, width, height } = setup(canvas, rows.length * rowH + 16);
  const labelW = 110;
  const valueW = 104; // fixed right-hand column so long bars never clip the figures
  const barX = labelW;
  const barW = width - barX - valueW;
  const max = Math.max(...rows.map((r) => Math.max(r.spent, r.budget)), 1);
  ctx.font = '13px Georgia, serif';
  ctx.textBaseline = 'middle';
  rows.forEach((r, i) => {
    const y = 14 + i * rowH;
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(r.label, 0, y + 8);
    const w = Math.max(2, (r.spent / max) * barW);
    ctx.fillStyle = r.spent > r.budget ? RED : GREEN;
    ctx.beginPath();
    ctx.roundRect(barX, y, w, 16, 4);
    ctx.fill();
    // budget marker
    const bx = barX + (r.budget / max) * barW;
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, y - 2);
    ctx.lineTo(bx, y + 18);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(moneyShort(r.spent) + ' / ' + moneyShort(r.budget), barX + barW + 8, y + 8);
  });
}

// Donut: income vs spending vs what's left, with a centre label.
export function drawDonut(canvas, income, spent) {
  const size = 190;
  const { ctx, width } = setup(canvas, size);
  const cx = width / 2;
  const cy = size / 2;
  const r = 78;
  const left = Math.max(0, income - spent);
  const parts = [
    { value: spent, color: RED, label: 'Spent' },
    { value: left, color: GREEN, label: 'Left' },
  ];
  const total = Math.max(1, spent + left);
  let start = -Math.PI / 2;
  for (const p of parts) {
    const sweep = (p.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + sweep);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    start += sweep;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.fillStyle = '#fffdf6';
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(moneyShort(left), cx, cy - 4);
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = MUTED;
  ctx.fillText('left this month', cx, cy + 16);
}

// Vertical bars: one per week of the month, spending per week.
export function drawWeeklyBars(canvas, weeks) {
  // weeks: [{label, amount}]
  const { ctx, width, height } = setup(canvas, 170);
  const max = Math.max(...weeks.map((w) => w.amount), 1);
  const slot = width / weeks.length;
  const barW = Math.min(64, slot * 0.55);
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'center';
  weeks.forEach((w, i) => {
    const x = slot * i + (slot - barW) / 2;
    const h = Math.max(3, (w.amount / max) * 118);
    ctx.fillStyle = i === weeks.length - 1 ? AMBER : GREEN;
    ctx.beginPath();
    ctx.roundRect(x, 138 - h, barW, h, 4);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillText(moneyShort(w.amount), slot * i + slot / 2, 128 - h);
    ctx.fillStyle = MUTED;
    ctx.fillText(w.label, slot * i + slot / 2, 156);
  });
  ctx.strokeStyle = GRID;
  ctx.beginPath();
  ctx.moveTo(0, 138.5);
  ctx.lineTo(width, 138.5);
  ctx.stroke();
}

export function palette(i) { return PALETTE[i % PALETTE.length]; }
