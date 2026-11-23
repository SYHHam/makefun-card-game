// game.js: Main game state machine, turn flow, win checks, staged scenes.

import { Deck } from './deck.js';
import { Player, AIPlayer, START_HAND } from './player.js';
import { checkRitualCompletion, RITUALS } from './ritual.js';
import { castSpell } from './spell.js';
import { createCard } from './card.js';
import { Table, LAYOUT, dealAnimation } from './table.js';
import { createParticles, tween } from './animator.js';
import { playSound, setMuted, isMuted } from './audio.js';

export const HOOK_LINE = 'Every card is a choice: feed a ritual, mend your flame, or break your rival\'s. Read the omen before it\'s too late.';

export function createGame() {
  return {
    screen: 'title',
    deck: new Deck(),
    player: new Player('You', false),
    ai: new AIPlayer('Opponent'),
    turn: 'player',
    selected: null,
    message: 'Welcome to the chamber.',
    table: new Table(),
    shake: 0,
    flash: null,
    aiTimer: null,
    // Card currently flying between two spots. Presentation only: the game
    // state underneath is already final while the proxy slides.
    fly: null,
  };
}

export function initGame(game) {
  game.deck = new Deck();
  game.deck.shuffle();
  game.player = new Player('You', false);
  game.ai = new AIPlayer('Opponent');
  game.selected = null;
  game.shake = 0;
  game.flash = null;
  game.fly = null;
  if (game.aiTimer) {
    clearTimeout(game.aiTimer);
    game.aiTimer = null;
  }
  for (let i = 0; i < START_HAND; i++) {
    game.player.drawCard(game.deck);
    game.ai.drawCard(game.deck);
  }
  // Opening deal: each player card slides from the deck to its hand slot.
  game.player.hand.forEach((card, i) => {
    const to = game.table.handCardPos(i, game.player.hand.length);
    dealAnimation(card, { x: LAYOUT.deck.x, y: LAYOUT.deck.y }, to, { tween });
  });
  game.turn = Math.random() < 0.5 ? 'player' : 'ai';
  game.message = game.turn === 'player'
    ? 'Your turn. Draw a card, then play one.'
    : 'Opponent starts. Watch their ritual area.';
  if (game.turn === 'player') startTurn(game);
  else scheduleAi(game);
  playSound('deal');
}

export function startGame(game) {
  game.screen = 'playing';
  initGame(game);
}

export function startTurn(game) {
  if (game.screen !== 'playing') return;
  game.turn = 'player';
  const drawn = game.player.drawCard(game.deck);
  game.player.trimHand(game.deck);
  if (drawn) {
    // The drawn card slides from the deck to its new hand slot.
    const to = game.table.handCardPos(game.player.hand.length - 1, game.player.hand.length);
    dealAnimation(drawn, { x: LAYOUT.deck.x, y: LAYOUT.deck.y }, to, { tween });
  }
  game.message = drawn
    ? 'Your turn. You drew a ' + drawn.suit + ' ' + drawn.value + '. Play one card.'
    : 'Your turn. The deck is empty. Play one card.';
  playSound('deal');
}

export function endTurn(game) {
  if (game.screen !== 'playing') return;
  game.selected = null;
  game.turn = 'ai';
  scheduleAi(game);
}

function scheduleAi(game) {
  if (game.aiTimer) clearTimeout(game.aiTimer);
  game.aiTimer = setTimeout(() => aiTakeTurn(game), 1100);
}

function aiTakeTurn(game) {
  if (game.screen !== 'playing') return;
  const ai = game.ai;
  const drawn = ai.drawCard(game.deck);
  ai.trimHand(game.deck);
  const choice = ai.decide({ me: ai, opponent: game.player });
  if (!choice) {
    startTurn(game);
    return;
  }
  if (choice.action === 'ritual') {
    const from = { x: LAYOUT.oppHand.x, y: LAYOUT.oppRitual.y, w: LAYOUT.oppHand.cardW, h: LAYOUT.oppHand.cardH };
    const to = game.table.oppRitualCardPos(ai.ritual.length);
    ai.removeFromHand(choice.card);
    ai.ritual.push(choice.card);
    flyCard(game, choice.card, from, to);
    playSound('ritual');
    game.message = 'Opponent places a ' + choice.card.suit + ' ' + choice.card.value + ' in their ritual.';
    resolveRituals(game, ai, game.player);
  } else {
    playSound('spell');
    game.message = castSpell(choice.card, ai, game.player, game);
  }
  if (checkWin(game)) return;
  startTurn(game);
}

// Slide one card from a hand position to a target slot as a flying proxy.
// The card is already in its new place in the state; the proxy is only
// drawn, and the card itself stays hidden until the proxy lands.
function flyCard(game, card, from, to) {
  card._flying = true;
  game.fly = { card, x: from.x, y: from.y, w: from.w, h: from.h };
  tween(game.fly, 'x', from.x, to.x, 350);
  tween(game.fly, 'y', from.y, to.y, 350, () => {
    game.fly = null;
    card._flying = false;
    createParticles(to.x + to.w / 2, to.y + to.h / 2, '#d4a84b', 10);
  });
}

// After a card is placed, complete any ritual it finishes.
export function resolveRituals(game, caster, target) {
  const done = checkRitualCompletion(caster.ritual);
  for (const { ritual, cards } of done) {
    for (const c of cards) {
      const i = caster.ritual.indexOf(c);
      if (i >= 0) caster.ritual.splice(i, 1);
      game.deck.discard(c);
    }
    caster.ritualsCompleted++;
    caster.completed.push(ritual.key);
    applyRitualEffect(game, ritual, caster, target);
    // The burst lands where the ritual actually completed, not at one
    // fixed point on the table.
    const px = caster === game.player
      ? LAYOUT.playerRitual.x + 214
      : LAYOUT.oppRitual.x + 222;
    const py = caster === game.player
      ? LAYOUT.playerRitual.y + 57
      : LAYOUT.oppRitual.y + 57;
    createParticles(px, py, '#d4a84b', 40);
    playSound('complete');
    game.message = caster.name + (caster.name === 'You' ? ' complete' : ' completes') +
      ' the ' + ritual.name + ' ritual. ' + ritual.blurb;
  }
}

function applyRitualEffect(game, ritual, caster, target) {
  if (ritual.key === 'binding') {
    caster.candles = Math.min(12, caster.candles + 2);
  } else if (ritual.key === 'warding') {
    target.candles = Math.max(0, target.candles - 2);
    game.shake = 8;
    game.flash = { color: 'rgba(217, 78, 78, 0.3)', until: performance.now() + 250 };
  } else if (ritual.key === 'veil') {
    if (target.hand.length > 0) {
      const i = Math.floor(Math.random() * target.hand.length);
      const stolen = target.hand.splice(i, 1)[0];
      caster.hand.push(stolen);
    }
  }
}

export function playSelectedToRitual(game) {
  if (game.screen !== 'playing' || game.turn !== 'player') return false;
  if (game.selected === null) {
    game.message = 'Select a card from your hand first.';
    return false;
  }
  if (game.player.ritual.length >= 5) {
    game.message = 'Your ritual area is full.';
    return false;
  }
  const card = game.player.hand[game.selected];
  const from = game.table.handCardPos(game.selected, game.player.hand.length);
  const to = game.table.ritualCardPos(game.player.ritual.length);
  game.player.removeFromHand(card);
  game.player.ritual.push(card);
  flyCard(game, card, from, to);
  playSound('ritual');
  game.message = 'You place a ' + card.suit + ' ' + card.value + ' in your ritual.';
  resolveRituals(game, game.player, game.ai);
  if (checkWin(game)) return true;
  endTurn(game);
  return true;
}

export function castSelectedSpell(game) {
  if (game.screen !== 'playing' || game.turn !== 'player') return false;
  if (game.selected === null) {
    game.message = 'Select a card from your hand first.';
    return false;
  }
  const card = game.player.hand[game.selected];
  const from = game.table.handCardPos(game.selected, game.player.hand.length);
  const to = { x: LAYOUT.discard.x, y: LAYOUT.discard.y, w: LAYOUT.discard.w, h: LAYOUT.discard.h };
  playSound('spell');
  game.message = castSpell(card, game.player, game.ai, game);
  flyCard(game, card, from, to);
  if (checkWin(game)) return true;
  endTurn(game);
  return true;
}

export function checkWin(game) {
  const p = game.player;
  const a = game.ai;
  if (p.ritualsCompleted >= 3 || a.candles <= 0) {
    game.screen = 'win';
    game.message = 'Ritual complete. You win.';
    createParticles(640, 320, '#d4a84b', 60);
    playSound('win');
    return true;
  }
  if (a.ritualsCompleted >= 3 || p.candles <= 0) {
    game.screen = 'loss';
    game.message = 'Your candles have died.';
    createParticles(640, 320, '#8a7a6a', 40);
    playSound('loss');
    return true;
  }
  return false;
}

export function toggleMute(game) {
  setMuted(!isMuted());
  game.message = isMuted() ? 'Sound muted.' : 'Sound on.';
}

// Deterministic staged states for screenshots. Never used in normal play.
export function stageScene(game, scene) {
  game.screen = 'playing';
  game.deck = new Deck([]);
  game.player = new Player('You', false);
  game.ai = new AIPlayer('Opponent');
  game.selected = null;
  game.shake = 0;
  game.flash = null;
  if (scene === 'table') {
    game.player.hand = [
      createCard('blood', 7), createCard('shadow', 4), createCard('bone', 2),
      createCard('blood', 3), createCard('shadow', 8),
    ];
    game.player.ritual = [createCard('blood', 5), createCard('blood', 6)];
    game.player.candles = 7;
    game.ai.hand = [
      createCard('bone', 5), createCard('shadow', 2), createCard('blood', 1),
      createCard('bone', 8), createCard('shadow', 6),
    ];
    game.ai.ritual = [createCard('bone', 4), createCard('bone', 6), createCard('shadow', 3)];
    game.ai.candles = 9;
    game.deck.cards = [];
    for (let i = 0; i < 12; i++) game.deck.cards.push(createCard('shadow', (i % 9) + 1));
    for (let i = 0; i < 8; i++) game.deck.discardPile.push(createCard('bone', (i % 9) + 1));
    game.turn = 'player';
    game.message = 'Your turn. Play a card to your ritual, or cast it as a spell.';
    game.selected = 0;
  } else if (scene === 'win') {
    game.player.candles = 9;
    game.player.ritualsCompleted = 3;
    game.player.completed = RITUALS.map((r) => r.key);
    game.ai.candles = 0;
    game.ai.hand = [createCard('blood', 2)];
    game.screen = 'win';
    game.message = 'Ritual complete. You win.';
  } else if (scene === 'loss') {
    game.player.candles = 0;
    game.ai.candles = 9;
    game.ai.ritualsCompleted = 3;
    game.ai.completed = RITUALS.map((r) => r.key);
    game.player.hand = [createCard('shadow', 1)];
    game.screen = 'loss';
    game.message = 'Your candles have died.';
  }
  return game;
}

// Snapshot for tests and debugging.
export function snapshot(game) {
  return {
    screen: game.screen,
    turn: game.turn,
    playerCandles: game.player.candles,
    aiCandles: game.ai.candles,
    handSize: game.player.hand.length,
    aiHandSize: game.ai.hand.length,
    playerRitual: game.player.ritual.map((c) => c.suit + ' ' + c.value),
    aiRitual: game.ai.ritual.map((c) => c.suit + ' ' + c.value),
    deckCount: game.deck.count,
    discardCount: game.deck.discardCount,
    ritualsPlayer: game.player.ritualsCompleted,
    ritualsAi: game.ai.ritualsCompleted,
    selected: game.selected,
    message: game.message,
  };
}
