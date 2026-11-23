// render.js: Canvas drawing. Card faces, suit symbols, table, hands.

import { SUITS, getSuitSymbol } from './card.js';
import { LAYOUT } from './table.js';
import { drawParticles } from './animator.js';

const PALETTE = {
  felt: '#1a1510',
  border: '#2d2418',
  cardBack: '#3d3225',
  cardFace: '#f5f0e6',
  flame: '#ffaa33',
  wax: '#f5e6c8',
  danger: '#d94e4e',
  gold: '#d4a84b',
  text: '#f5f0e6',
  textDark: '#1a1510',
  glow: '#4a9eff',
};

export function clearCanvas(ctx) {
  ctx.clearRect(0, 0, LAYOUT.width, LAYOUT.height);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The altar: two chalk circles and tick marks around the deck and discard,
// so the empty middle of the table becomes the ritual circle itself.
// The rings are clipped to the bare table with the even-odd rule: every
// frame, card, label and line of text is cut out of the clip region, so a
// ring never crosses a border or a word. The circle reads as painted on the
// table underneath the game pieces instead of cutting through them.
function drawAltar(ctx) {
  const cx = 640;
  const cy = 328;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, LAYOUT.width, LAYOUT.height);
  const holes = [
    [622, 38, 480, 150],   // opponent ritual frame
    [162, 250, 480, 150],  // player ritual frame
    [554, 262, 92, 132],   // deck pile
    [674, 262, 92, 132],   // discard pile
    [538, 388, 124, 28],   // DECK label
    [644, 388, 152, 28],   // DISCARD label
    [540, 230, 200, 26],   // YOUR TURN / OPPONENT THINKING...
    [320, 412, 640, 32],   // message line
    [163, 444, 645, 184],  // player hand
  ];
  for (const [x, y, w, h] of holes) ctx.rect(x, y, w, h);
  ctx.clip('evenodd');
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 168, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.22)';
  ctx.setLineDash([4, 10]);
  ctx.beginPath();
  ctx.arc(cx, cy, 142, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Tick marks on the outer ring, one for each candle of a full flame.
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * 158;
    const y1 = cy + Math.sin(a) * 158;
    const x2 = cx + Math.cos(a) * 168;
    const y2 = cy + Math.sin(a) * 168;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

// Thin gold frames behind the two ritual areas, so each zone reads as one
// place on the table instead of loose cards on felt.
function drawRitualFrames(ctx) {
  const L = LAYOUT;
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.28)';
  ctx.lineWidth = 2;
  roundRect(ctx, L.playerRitual.x - 12, L.playerRitual.y - 12,
    5 * L.playerRitual.cardW + 4 * L.playerRitual.gap + 24, L.playerRitual.cardH + 24, 10);
  ctx.stroke();
  roundRect(ctx, L.oppRitual.x - 12, L.oppRitual.y - 12,
    5 * L.oppRitual.cardW + 4 * L.oppRitual.gap + 24, L.oppRitual.cardH + 24, 10);
  ctx.stroke();
  ctx.restore();
}

// A card mid-flight: drawn by the UI on top of the table while its tween runs.
export function drawFlyingCard(ctx, game) {
  const fly = game.fly;
  if (!fly) return;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  renderCard(ctx, fly.card, fly.x, fly.y, fly.w, fly.h);
  ctx.restore();
}

// Draw one suit symbol centered at (cx, cy) with the given size.
export function drawSuitSymbol(ctx, suit, cx, cy, size) {
  const s = SUITS[suit];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = s.color;
  ctx.strokeStyle = s.dark;
  ctx.lineWidth = Math.max(2, size * 0.08);
  if (suit === 'blood') {
    // Teardrop, pointed at the bottom.
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.bezierCurveTo(size * 0.42, -size * 0.05, size * 0.38, size * 0.32, 0, size * 0.5);
    ctx.bezierCurveTo(-size * 0.38, size * 0.32, -size * 0.42, -size * 0.05, 0, -size * 0.5);
    ctx.fill();
    ctx.stroke();
  } else if (suit === 'bone') {
    // Skull: round cranium, jaw, hollow eyes.
    ctx.beginPath();
    ctx.arc(0, -size * 0.08, size * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-size * 0.2, size * 0.14, size * 0.4, size * 0.24);
    ctx.strokeRect(-size * 0.2, size * 0.14, size * 0.4, size * 0.24);
    ctx.fillStyle = PALETTE.textDark;
    ctx.beginPath();
    ctx.arc(-size * 0.13, -size * 0.1, size * 0.09, 0, Math.PI * 2);
    ctx.arc(size * 0.13, -size * 0.1, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Shadow wisp: spiral curl.
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 4.4; a += 0.25) {
      const r = size * 0.42 * (1 - a / (Math.PI * 5.2));
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r - size * 0.05;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.lineCap = 'round';
    ctx.strokeStyle = s.color;
    ctx.stroke();
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(0, -size * 0.42, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFlame(ctx, x, y, size, t) {
  const flick = 1 + Math.sin(t * 0.006 + x) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flick, flick);
  ctx.fillStyle = PALETTE.flame;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.7, -size * 0.2, size * 0.55, size * 0.5, 0, size * 0.6);
  ctx.bezierCurveTo(-size * 0.55, size * 0.5, -size * 0.7, -size * 0.2, 0, -size);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.45);
  ctx.bezierCurveTo(size * 0.35, 0, size * 0.28, size * 0.35, 0, size * 0.42);
  ctx.bezierCurveTo(-size * 0.28, size * 0.35, -size * 0.35, 0, 0, -size * 0.45);
  ctx.fill();
  ctx.restore();
}

export function renderCard(ctx, card, x, y, w, h, opts) {
  const o = opts || {};
  const s = SUITS[card.suit];
  ctx.save();
  if (o.selected) {
    ctx.shadowColor = PALETTE.glow;
    ctx.shadowBlur = 18;
  }
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = PALETTE.cardFace;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = o.selected ? PALETTE.glow : PALETTE.border;
  ctx.lineWidth = o.selected ? 3 : 2;
  ctx.stroke();
  ctx.clip();

  const ink = card.suit === 'bone' ? s.dark : s.color;
  // Big value, top left and center.
  ctx.fillStyle = ink;
  ctx.font = 'bold ' + Math.round(h * 0.32) + 'px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(card.value), x + 8, y + 4);
  ctx.textAlign = 'center';
  ctx.font = 'bold ' + Math.round(h * 0.34) + 'px Georgia, serif';
  ctx.fillText(String(card.value), x + w / 2, y + h * 0.42);
  // Suit symbol, upper middle. Large and bold so it reads at thumbnail size.
  drawSuitSymbol(ctx, card.suit, x + w / 2, y + h * 0.26, Math.min(w, h) * 0.36);
  // Suit label at the bottom.
  ctx.fillStyle = ink;
  ctx.font = 'bold ' + Math.round(h * 0.11) + 'px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s.label, x + w / 2, y + h - 10);
  ctx.restore();
}

export function renderCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = PALETTE.cardBack;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 5);
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Ritual sigil: a gold ring with the three suit marks inside, so the back
  // reads as this game's seal instead of a bare letter.
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.3;
  ctx.save();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const s = Math.min(w, h) * 0.16;
  drawSuitSymbol(ctx, 'blood', cx, cy - r * 0.52, s);
  drawSuitSymbol(ctx, 'bone', cx - r * 0.52, cy + r * 0.42, s);
  drawSuitSymbol(ctx, 'shadow', cx + r * 0.52, cy + r * 0.42, s);
  ctx.restore();
}

export function renderHand(ctx, hand, selected, table) {
  for (let i = 0; i < hand.length; i++) {
    const pos = table.handCardPos(i, hand.length);
    const card = hand[i];
    const lift = selected === i ? -18 : 0;
    const p = card._anim || pos;
    renderCard(ctx, card, p.x, p.y + lift, pos.w, pos.h, { selected: selected === i });
  }
}

export function renderTable(ctx, game, t) {
  const L = LAYOUT;
  // Layered felt: flat base, a warm central glow, and a dark vignette so the
  // middle of the table has depth instead of one flat dark field.
  ctx.fillStyle = PALETTE.felt;
  ctx.fillRect(0, 0, L.width, L.height);
  const glow = ctx.createRadialGradient(640, 340, 60, 640, 340, 560);
  glow.addColorStop(0, 'rgba(255, 170, 51, 0.07)');
  glow.addColorStop(1, 'rgba(255, 170, 51, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, L.width, L.height);
  const vig = ctx.createRadialGradient(640, 360, 240, 640, 360, 720);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, L.width, L.height);
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, L.width - 10, L.height - 10);
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, L.width - 32, L.height - 32);

  drawAltar(ctx);
  drawRitualFrames(ctx);

  // Deck pile.
  renderCardBack(ctx, L.deck.x, L.deck.y, L.deck.w, L.deck.h);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('DECK ' + game.deck.count, L.deck.x + L.deck.w / 2, L.deck.y + L.deck.h + 24);

  // Discard pile.
  const top = game.deck.discardPile[game.deck.discardPile.length - 1];
  // A card still flying to the discard is drawn by the flying proxy instead.
  if (top && !top._flying) {
    renderCard(ctx, top, L.discard.x, L.discard.y, L.discard.w, L.discard.h);
  } else if (!top) {
    roundRect(ctx, L.discard.x, L.discard.y, L.discard.w, L.discard.h, 8);
    ctx.strokeStyle = 'rgba(245, 240, 230, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('DISCARD ' + game.deck.discardCount, L.discard.x + L.discard.w / 2, L.discard.y + L.discard.h + 24);

  drawParticles(ctx);
}
