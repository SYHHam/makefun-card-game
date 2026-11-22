// player.js: Player and AIPlayer, plus the AI intent indicator.

import { checkRitualCompletion, ritualProgress, RITUALS } from './ritual.js';

export const MAX_CANDLES = 12;
export const START_CANDLES = 9;
export const START_HAND = 5;
export const MAX_HAND = 7;
export const MAX_RITUAL_AREA = 5;

export class Player {
  constructor(name, isAI) {
    this.name = name;
    this.isAI = !!isAI;
    this.candles = START_CANDLES;
    this.hand = [];
    this.ritual = [];
    this.ritualsCompleted = 0;
    this.completed = [];
  }

  drawCard(deck) {
    const card = deck.draw();
    if (card) this.hand.push(card);
    return card;
  }

  removeFromHand(card) {
    const i = this.hand.indexOf(card);
    if (i >= 0) this.hand.splice(i, 1);
  }

  trimHand(deck) {
    while (this.hand.length > MAX_HAND) {
      const card = this.hand.pop();
      deck.discard(card);
    }
  }
}

export class AIPlayer extends Player {
  constructor(name) {
    super(name, true);
  }

  // Decide one play. Returns { action: 'ritual'|'spell', card }.
  // state: { me, opponent } where me is this AI player.
  decide(state) {
    const me = state.me;
    const opp = state.opponent;

    // 1. Take a ritual completion if one card finishes it.
    for (const card of me.hand) {
      const area = me.ritual.concat([card]);
      if (checkRitualCompletion(area).length > 0) {
        return { action: 'ritual', card };
      }
    }

    // 2. Disrupt: opponent is one card from a ritual and we hold Shadow.
    for (const ritual of RITUALS) {
      const p = ritualProgress(opp.ritual, ritual);
      if (p.count >= 2 && p.total >= ritual.minTotal - 9) {
        const shadow = me.hand.find((c) => c.suit === 'shadow');
        if (shadow) return { action: 'spell', card: shadow };
      }
    }

    // 3. Desperate: low candles, burn a Blood card to snuff one.
    if (me.candles <= 3) {
      const blood = me.hand.find((c) => c.suit === 'blood');
      if (blood) return { action: 'spell', card: blood };
    }

    // 4. Build toward the suit we already have most of in the ritual area.
    if (me.ritual.length < MAX_RITUAL_AREA && me.hand.length > 0) {
      const counts = { blood: 0, bone: 0, shadow: 0 };
      for (const c of me.ritual) counts[c.suit]++;
      const bestSuit = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      const match = me.hand
        .filter((c) => c.suit === bestSuit)
        .sort((a, b) => b.value - a.value)[0];
      if (match) return { action: 'ritual', card: match };
      const high = me.hand.slice().sort((a, b) => b.value - a.value)[0];
      return { action: 'ritual', card: high };
    }

    // 5. Fallback: kindle a candle with Bone, else play the lowest card.
    const bone = me.hand.find((c) => c.suit === 'bone');
    if (bone && me.candles < START_CANDLES) return { action: 'spell', card: bone };
    const low = me.hand.slice().sort((a, b) => a.value - b.value)[0];
    if (low) return { action: 'ritual', card: low };
    return null;
  }
}

// Visible AI intent: BUILDING, DISRUPTING, or DESPERATE.
export function getIntent(ai, game) {
  if (ai.candles <= 3) return 'DESPERATE';
  const opp = game.player;
  for (const ritual of RITUALS) {
    const p = ritualProgress(opp.ritual, ritual);
    if (p.count >= 2) return 'DISRUPTING';
  }
  return 'BUILDING';
}

// Warns when the AI is one card from completing a ritual.
export function aiNearRitual(ai) {
  for (const ritual of RITUALS) {
    const p = ritualProgress(ai.ritual, ritual);
    if (p.count >= 2 && p.total >= ritual.minTotal - 9) return ritual;
  }
  return null;
}
