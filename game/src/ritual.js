// ritual.js: Ritual types, completion checks, effects.

export const RITUALS = [
  {
    key: 'binding',
    name: 'Binding',
    suit: 'blood',
    minCards: 3,
    minTotal: 15,
    effect: 'gain 2 candles',
    blurb: 'Bind the flame. Gain 2 candles.',
  },
  {
    key: 'warding',
    name: 'Warding',
    suit: 'bone',
    minCards: 3,
    minTotal: 12,
    effect: 'opponent loses 2 candles',
    blurb: 'Ward the circle. Opponent loses 2 candles.',
  },
  {
    key: 'veil',
    name: 'Veil',
    suit: 'shadow',
    minCards: 3,
    minTotal: 10,
    effect: 'steal 1 card from opponent hand',
    blurb: 'Lift the veil. Steal 1 card from the opponent hand.',
  },
];

export function ritualForSuit(suit) {
  return RITUALS.find((r) => r.suit === suit) || null;
}

// Returns every ritual that the cards in ritualArea currently complete.
// Each result is { ritual, cards } where cards are the matching suit cards.
export function checkRitualCompletion(ritualArea) {
  const done = [];
  for (const ritual of RITUALS) {
    const cards = ritualArea.filter((c) => c.suit === ritual.suit);
    const total = cards.reduce((s, c) => s + c.value, 0);
    if (cards.length >= ritual.minCards && total >= ritual.minTotal) {
      done.push({ ritual, cards: cards.slice() });
    }
  }
  return done;
}

export function getRitualEffect(ritual) {
  return ritual.effect;
}

// Progress toward one ritual: { count, need, total, minTotal }.
export function ritualProgress(ritualArea, ritual) {
  const cards = ritualArea.filter((c) => c.suit === ritual.suit);
  return {
    count: cards.length,
    need: ritual.minCards,
    total: cards.reduce((s, c) => s + c.value, 0),
    minTotal: ritual.minTotal,
  };
}
