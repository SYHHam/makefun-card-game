// spell.js: Dual-use spell effects. Every card can be cast instead of
// being placed in the ritual area, at the cost of its ritual potential.

import { MAX_CANDLES } from './player.js';

export const SPELLS = {
  blood: {
    name: 'Blood Rite',
    desc: 'Snuff 1 opponent candle.',
  },
  bone: {
    name: 'Bone Ward',
    desc: 'Kindle 1 of your own candles.',
  },
  shadow: {
    name: 'Shadow Theft',
    desc: 'Shatter 1 opponent ritual card, or make them discard 1 card.',
  },
};

export function canTarget(card, caster, target) {
  return !!card && !!caster && !!target && caster !== target;
}

// Verb agreement for the two speakers: 'You' takes the base form,
// 'Opponent' takes the third person form.
function conj(name, base, third) {
  return name === 'You' ? base : third;
}

function possessive(name) {
  return name === 'You' ? 'your' : "the Opponent's";
}

// Apply the spell of a card. Returns a message describing what happened.
export function castSpell(card, caster, target, game) {
  const spell = SPELLS[card.suit];
  if (!spell) return 'Nothing happens.';
  caster.removeFromHand(card);
  game.deck.discard(card);
  if (card.suit === 'blood') {
    target.candles = Math.max(0, target.candles - 1);
    game.shake = 10;
    game.flash = { color: 'rgba(217, 78, 78, 0.35)', until: performance.now() + 250 };
    return caster.name + ' ' + conj(caster.name, 'cast', 'casts') + ' Blood Rite. ' +
      target.name + ' ' + conj(target.name, 'lose', 'loses') + ' 1 candle.';
  }
  if (card.suit === 'bone') {
    caster.candles = Math.min(MAX_CANDLES, caster.candles + 1);
    return caster.name + ' ' + conj(caster.name, 'cast', 'casts') + ' Bone Ward. ' +
      caster.name + ' ' + conj(caster.name, 'gain', 'gains') + ' 1 candle.';
  }
  // Shadow: break a ritual card if one is showing, else force a discard.
  if (target.ritual.length > 0) {
    const i = Math.floor(Math.random() * target.ritual.length);
    const broken = target.ritual.splice(i, 1)[0];
    game.deck.discard(broken);
    return caster.name + ' ' + conj(caster.name, 'cast', 'casts') + ' Shadow Theft. A ' + broken.suit + ' ' + broken.value +
      ' is shattered from ' + possessive(target.name) + ' ritual.';
  }
  if (target.hand.length > 0) {
    const i = Math.floor(Math.random() * target.hand.length);
    const lost = target.hand.splice(i, 1)[0];
    game.deck.discard(lost);
    return caster.name + ' ' + conj(caster.name, 'cast', 'casts') + ' Shadow Theft. ' + target.name +
      ' ' + conj(target.name, 'discard', 'discards') + ' a ' + lost.suit + ' ' + lost.value + '.';
  }
  return caster.name + ' ' + conj(caster.name, 'cast', 'casts') + ' Shadow Theft, but ' + target.name +
    ' ' + conj(target.name, 'have', 'has') + ' nothing to lose.';
}
