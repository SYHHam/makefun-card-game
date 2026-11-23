// ui.js: UI rendering. Buttons, candle totals, intent indicator, screens.

import { SUITS } from './card.js';
import { RITUALS, ritualForSuit, ritualProgress } from './ritual.js';
import { SPELLS } from './spell.js';
import { LAYOUT } from './table.js';
import { drawFlame, drawFlyingCard, drawSuitSymbol, renderCard, renderCardBack, renderHand, renderTable } from './render.js';
import { getIntent, aiNearRitual, aiThreatLine } from './player.js';

const TEXT = '#f5f0e6';
const GOLD = '#d4a84b';
const DANGER = '#d94e4e';
const GLOW = '#4a9eff';
const MUTED = 'rgba(245, 240, 230, 0.6)';

export function drawButton(ctx, btn) {
  ctx.save();
  roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fillStyle = btn.enabled === false ? '#3d3225' : (btn.hot ? '#8a6a2f' : '#2d2418');
  ctx.fill();
  ctx.strokeStyle = btn.enabled === false ? '#555' : GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = btn.enabled === false ? '#999' : TEXT;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCandles(ctx, x, y, count, t, label) {
  ctx.save();
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label + ' ' + count + ' CANDLES', x, y);
  const textW = ctx.measureText(label + ' ' + count + ' CANDLES').width;
  const startX = x + textW + 16;
  const shown = Math.min(count, 12);
  for (let i = 0; i < shown; i++) {
    drawFlame(ctx, startX + i * 20 + 8, y - 2, 11, t + i * 40);
  }
  ctx.restore();
}

export function drawIntent(ctx, x, y, intent) {
  const color = intent === 'DESPERATE' ? DANGER : intent === 'DISRUPTING' ? '#ffaa33' : GLOW;
  ctx.save();
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('INTENT: ', x, y);
  const w = ctx.measureText('INTENT: ').width;
  ctx.fillStyle = color;
  ctx.fillText(intent, x + w, y);
  ctx.restore();
}

function drawRitualProgress(ctx, x, y, player) {
  ctx.save();
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('RITUALS ' + player.ritualsCompleted + '/3', x, y);
  let cx = x + 140;
  for (const ritual of RITUALS) {
    const p = ritualProgress(player.ritual, ritual);
    const done = player.completed.includes(ritual.key);
    ctx.beginPath();
    ctx.arc(cx, y - 8, 16, 0, Math.PI * 2);
    ctx.fillStyle = done ? GOLD : '#2d2418';
    ctx.fill();
    ctx.strokeStyle = done ? GOLD : SUITS[ritual.suit].color;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawSuitSymbol(ctx, ritual.suit, cx, y - 8, 18);
    ctx.fillStyle = done ? GOLD : TEXT;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(ritual.name + ' ' + p.count + '/' + p.need, cx, y + 22);
    cx += 75;
  }
  ctx.restore();
}

function drawHook(ctx) {
  ctx.save();
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    'Every card is a choice: feed a ritual, mend your flame, or break your rival\'s. Read the omen before it\'s too late.',
    LAYOUT.hook.x, LAYOUT.hook.y);
  ctx.restore();
}

// The dual-use panel: what the selected card does as a ritual component and
// as a spell, so each hand is visibly a decision between two plays.
function drawDualUsePanel(ctx, game) {
  const x = 830;
  const y = 540;
  const w = 380;
  const h = 66;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.55)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const card = game.selected !== null ? game.player.hand[game.selected] : null;
  if (!card) {
    ctx.fillStyle = MUTED;
    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillText('Select a card to see its ritual and spell.', x + 14, y + h / 2);
    ctx.restore();
    return;
  }
  const ritual = ritualForSuit(card.suit);
  const p = ritualProgress(game.player.ritual, ritual);
  const spell = SPELLS[card.suit];
  const spellShort = card.suit === 'blood' ? 'snuff 1 opponent candle'
    : card.suit === 'bone' ? 'regain 1 candle'
    : 'break 1 rival ritual card';
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText('RITUAL: add ' + SUITS[card.suit].label + ' ' + card.value +
    ' toward ' + ritual.name + ' (' + p.count + '/' + p.need + ', ' + p.total + '/' + p.minTotal + ')',
    x + 14, y + 20);
  ctx.fillStyle = GOLD;
  ctx.fillText('SPELL: ' + spell.name + ', ' + spellShort, x + 14, y + 46);
  ctx.restore();
}

export function drawUI(ctx, game, t) {
  const L = LAYOUT;
  ctx.save();
  // Title bar.
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 32px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('RITUAL & RUIN', L.title.x, L.title.y + 24);
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  const turnText = game.screen === 'playing'
    ? (game.turn === 'player' ? 'YOUR TURN' : 'OPPONENT THINKING...')
    : '';
  ctx.fillStyle = game.turn === 'player' ? GOLD : MUTED;
  ctx.fillText(turnText, L.turnLabel.x, L.turnLabel.y + 20);

  // Opponent row.
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillStyle = TEXT;
  ctx.fillText('OPPONENT', L.oppLabel.x, L.oppLabel.y);
  drawCandles(ctx, L.oppCandles.x, L.oppCandles.y + 12, game.ai.candles, t, '');
  drawIntent(ctx, L.intent.x, L.intent.y, getIntent(game.ai, game));
  // The threat line names the rival's nearest ritual with its suit progress
  // and value against the target, on a dark pill so it reads over the altar.
  const threat = aiThreatLine(game.ai);
  if (threat) {
    const near = aiNearRitual(game.ai);
    ctx.save();
    ctx.font = 'bold 18px Georgia, serif';
    const tw = ctx.measureText(threat).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    roundRectPath(ctx, L.warning.x - 10, L.warning.y - 16, tw + 20, 32, 8);
    ctx.fill();
    ctx.fillStyle = near ? DANGER : GOLD;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(threat, L.warning.x, L.warning.y);
    ctx.restore();
  }
  // Opponent ritual area, face up.
  ctx.fillStyle = MUTED;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('RITUAL AREA', L.oppRitual.x, L.oppRitual.y - 8);
  game.ai.ritual.forEach((card, i) => {
    if (card._flying) return;
    const p = { x: L.oppRitual.x + i * (L.oppRitual.cardW + L.oppRitual.gap), y: L.oppRitual.y };
    renderCard(ctx, card, p.x, p.y, L.oppRitual.cardW, L.oppRitual.cardH);
  });
  // Opponent hand, face down, with a readable count.
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText('OPPONENT HAND \u2022 ' + game.ai.hand.length, L.oppHand.x, L.oppRitual.y - 8);
  game.ai.hand.forEach((card, i) => {
    renderCardBack(ctx, L.oppHand.x + i * (L.oppHand.cardW + L.oppHand.gap), L.oppRitual.y, L.oppHand.cardW, L.oppHand.cardH);
  });

  // Player ritual area.
  ctx.fillStyle = MUTED;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('YOUR RITUAL', L.playerRitualLabel.x, L.playerRitualLabel.y);
  game.player.ritual.forEach((card, i) => {
    if (card._flying) return;
    const p = { x: L.playerRitual.x + i * (L.playerRitual.cardW + L.playerRitual.gap), y: L.playerRitual.y };
    renderCard(ctx, card, p.x, p.y, L.playerRitual.cardW, L.playerRitual.cardH);
  });

  // Message line.
  ctx.fillStyle = TEXT;
  ctx.font = 'italic 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.message, L.message.x, L.message.y);

  // Player hand.
  renderHand(ctx, game.player.hand, game.selected, game.table);
  // A card mid-flight is drawn on top of the table.
  drawFlyingCard(ctx, game);
  // What the selected card does as a ritual and as a spell.
  drawDualUsePanel(ctx, game);

  // Bottom bar: candles, ritual progress, action buttons.
  drawCandles(ctx, L.playerCandles.x, L.playerCandles.y, game.player.candles, t, 'YOU:');
  drawRitualProgress(ctx, L.progress.x, L.progress.y, game.player);
  const canPlay = game.screen === 'playing' && game.turn === 'player' && game.selected !== null;
  drawButton(ctx, { ...L.ritualButton, label: 'PLAY TO RITUAL  (R)', enabled: canPlay });
  drawButton(ctx, { ...L.spellButton, label: 'CAST SPELL  (S)', enabled: canPlay });
  drawHook(ctx);
  ctx.restore();
}

export function drawTitle(ctx, game, t) {
  const L = LAYOUT;
  ctx.fillStyle = '#1a1510';
  ctx.fillRect(0, 0, L.width, L.height);
  // Chamber glow and candles.
  const grad = ctx.createRadialGradient(640, 300, 40, 640, 300, 520);
  grad.addColorStop(0, 'rgba(255, 170, 51, 0.16)');
  grad.addColorStop(1, 'rgba(26, 21, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, L.width, L.height);
  // Faint altar ring behind the title, the same seal as on the table.
  // Clipped around the title, the taglines, the seals and the buttons, so
  // no ring ever crosses a word or a button edge.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, L.width, L.height);
  const titleHoles = [
    [295, 152, 690, 76],  // RITUAL & RUIN
    [470, 238, 340, 36],  // A Duel of Occultists
    [370, 298, 540, 28],  // 3 rituals, dual-use cards, extinguish the rival
    [488, 316, 304, 64],  // the three suit seals
    [484, 394, 312, 68],  // START GAME
    [484, 470, 312, 68],  // HOW TO PLAY
  ];
  for (const [x, y, w, h] of titleHoles) ctx.rect(x, y, w, h);
  ctx.clip('evenodd');
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(640, 330, 250, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([4, 10]);
  ctx.strokeStyle = 'rgba(212, 168, 75, 0.1)';
  ctx.beginPath();
  ctx.arc(640, 330, 228, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  for (let i = 0; i < 5; i++) {
    const x = 300 + i * 170;
    ctx.fillStyle = '#f5e6c8';
    ctx.fillRect(x - 8, 560, 16, 70);
    drawFlame(ctx, x, 548, 16, t + i * 120);
  }
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('RITUAL & RUIN', 640, 220);
  ctx.fillStyle = TEXT;
  ctx.font = 'italic 28px Georgia, serif';
  ctx.fillText('A Duel of Occultists', 640, 268);
  // The three suits as seals around the title, so the game's identity is
  // visible before a single card is dealt.
  const suits = ['blood', 'bone', 'shadow'];
  suits.forEach((suit, i) => {
    const cx = 520 + i * 120;
    const cy = 348;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#2d2418';
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawSuitSymbol(ctx, suit, cx, cy, 28);
    ctx.restore();
  });
  ctx.fillStyle = MUTED;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('3 rituals \u2022 dual-use cards \u2022 extinguish the rival', 640, 320);
  drawButton(ctx, { x: 490, y: 400, w: 300, h: 56, label: 'START GAME' });
  drawButton(ctx, { x: 490, y: 476, w: 300, h: 56, label: 'HOW TO PLAY' });
  ctx.fillStyle = MUTED;
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Click a card, then PLAY TO RITUAL or CAST SPELL. Keys: 1-7 select, R ritual, S spell.', 640, 662);
}

export function drawHelp(ctx) {
  const L = LAYOUT;
  ctx.fillStyle = '#1a1510';
  ctx.fillRect(0, 0, L.width, L.height);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOW TO PLAY', 640, 90);
  const lines = [
    'Two occultists duel in a candlelit chamber. Each has 9 candles.',
    'Each turn you draw a card, then play exactly one card:',
    '',
    'PLAY TO RITUAL: place the card in your ritual area (max 5).',
    '  Binding: 3+ Blood cards totalling 15 or more. Gain 2 candles.',
    '  Warding: 3+ Bone cards totalling 12 or more. Opponent loses 2 candles.',
    '  Veil: 3+ Shadow cards totalling 10 or more. Steal 1 card from the opponent.',
    '',
    'CAST SPELL: discard the card for its effect instead.',
    '  Blood Rite: snuff 1 opponent candle.  Bone Ward: gain 1 candle.',
    '  Shadow Theft: shatter 1 opponent ritual card, or force a discard.',
    '',
    'Win by completing 3 rituals, or by snuffing all the opponent candles.',
    'Lose if your own candles reach 0.',
  ];
  ctx.fillStyle = TEXT;
  ctx.font = '19px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 150 + i * 32));
  drawButton(ctx, { x: 540, y: 620, w: 200, h: 48, label: 'BACK' });
}

export function drawEnd(ctx, game, won) {
  const L = LAYOUT;
  ctx.fillStyle = '#1a1510';
  ctx.fillRect(0, 0, L.width, L.height);
  // End-screen payoff: a gold burst for the win, cold ash for the loss, over
  // the same faint altar ring as the table and title.
  if (won) {
    const grad = ctx.createRadialGradient(640, 300, 40, 640, 300, 520);
    grad.addColorStop(0, 'rgba(255, 170, 51, 0.22)');
    grad.addColorStop(1, 'rgba(26, 21, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, L.width, L.height);
  } else {
    const grad = ctx.createRadialGradient(640, 360, 60, 640, 360, 560);
    grad.addColorStop(0, 'rgba(120, 110, 100, 0.12)');
    grad.addColorStop(1, 'rgba(26, 21, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, L.width, L.height);
  }
  // The same faint altar ring as the table and title, clipped around the
  // headline, the flavour line, the seals and the candle totals, so the
  // ring never crosses a word.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, L.width, L.height);
  const endHoles = [
    [430, 108, 420, 68],  // YOU WIN / YOU LOSE
    [430, 190, 420, 38],  // RITUAL COMPLETE / YOUR CANDLES HAVE DIED
    [320, 240, 640, 30],  // flavour line
    [458, 298, 364, 128], // ritual seals and their names
    [370, 456, 540, 30],  // candle totals
    [484, 514, 312, 68],  // PLAY AGAIN / TRY AGAIN
  ];
  for (const [x, y, w, h] of endHoles) ctx.rect(x, y, w, h);
  ctx.clip('evenodd');
  ctx.strokeStyle = won ? 'rgba(212, 168, 75, 0.2)' : 'rgba(154, 147, 138, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(640, 360, 280, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.textAlign = 'center';
  if (won) {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 80px Georgia, serif';
    ctx.fillText('YOU WIN', 640, 170);
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillText('RITUAL COMPLETE', 640, 222);
    ctx.fillStyle = TEXT;
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText('Three rituals sealed. The chamber is yours.', 640, 264);
  } else {
    ctx.fillStyle = '#c2705e';
    ctx.font = 'bold 80px Georgia, serif';
    ctx.fillText('YOU LOSE', 640, 170);
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText('YOUR CANDLES HAVE DIED', 640, 222);
    ctx.fillStyle = TEXT;
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText('The dark takes the circle. The rival occultist prevails.', 640, 264);
  }
  // Ritual seals, larger than before, with a strong candle hierarchy.
  let cx = 640 - 130;
  for (const ritual of RITUALS) {
    const done = (won ? game.player : game.ai).completed.includes(ritual.key);
    ctx.beginPath();
    ctx.arc(cx, 350, 46, 0, Math.PI * 2);
    ctx.fillStyle = done ? GOLD : '#2d2418';
    ctx.fill();
    ctx.strokeStyle = done ? GOLD : '#555';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawSuitSymbol(ctx, ritual.suit, cx, 350, 48);
    ctx.fillStyle = done ? GOLD : MUTED;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(ritual.name, cx, 420);
    cx += 130;
  }
  ctx.fillStyle = TEXT;
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('YOU: ' + game.player.candles + ' CANDLES      OPPONENT: ' + game.ai.candles + ' CANDLES', 640, 480);
  drawButton(ctx, { x: 490, y: 520, w: 300, h: 56, label: won ? 'PLAY AGAIN' : 'TRY AGAIN' });
}

export { renderTable };
