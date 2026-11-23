// table.js: Table layout constants and card placement helpers.

export const LAYOUT = {
  width: 1280,
  height: 720,
  title: { x: 40, y: 30 },
  oppLabel: { x: 80, y: 78 },
  oppCandles: { x: 200, y: 66 },
  oppRitual: { x: 640, y: 56, cardW: 76, cardH: 114, gap: 16 },
  oppHand: { x: 1000, y: 56, cardW: 46, cardH: 80, gap: 6 },
  intent: { x: 80, y: 112 },
  warning: { x: 640, y: 208 },
  deck: { x: 560, y: 268, w: 80, h: 120 },
  discard: { x: 680, y: 268, w: 80, h: 120 },
  playerRitualLabel: { x: 180, y: 256 },
  playerRitual: { x: 180, y: 268, cardW: 76, cardH: 114, gap: 12 },
  message: { x: 640, y: 436 },
  hand: { x: 240, y: 470, cardW: 100, cardH: 150, overlap: 88 },
  playerCandles: { x: 80, y: 656 },
  progress: { x: 440, y: 650 },
  ritualButton: { x: 780, y: 628, w: 190, h: 44 },
  spellButton: { x: 990, y: 628, w: 190, h: 44 },
  hook: { x: 640, y: 690 },
  turnLabel: { x: 640, y: 230 },
};

export class Table {
  constructor() {
    this.layout = LAYOUT;
  }

  handCardPos(i, handSize) {
    const L = LAYOUT.hand;
    const totalW = L.cardW + Math.max(0, handSize - 1) * L.overlap;
    const startX = L.x + (5 * L.overlap + L.cardW - totalW) / 2;
    return { x: startX + i * L.overlap, y: L.y, w: L.cardW, h: L.cardH };
  }

  ritualCardPos(i) {
    const L = LAYOUT.playerRitual;
    return { x: L.x + i * (L.cardW + L.gap), y: L.y, w: L.cardW, h: L.cardH };
  }

  oppRitualCardPos(i) {
    const L = LAYOUT.oppRitual;
    return { x: L.x + i * (L.cardW + L.gap), y: L.y, w: L.cardW, h: L.cardH };
  }
}

// Slide a card from one rect to another over 400ms.
export function dealAnimation(card, from, to, animator) {
  const proxy = { x: from.x, y: from.y };
  card._anim = proxy;
  animator.tween(proxy, 'x', from.x, to.x, 400);
  animator.tween(proxy, 'y', from.y, to.y, 400, () => { card._anim = null; });
}

// Place a card into an area (ritual or discard) at its slot position.
export function placeCard(card, area, index, table) {
  const pos = area === 'playerRitual'
    ? table.ritualCardPos(index)
    : table.oppRitualCardPos(index);
  card._anim = { x: pos.x, y: pos.y };
  return pos;
}

export const table = new Table();
